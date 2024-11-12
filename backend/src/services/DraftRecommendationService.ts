import { Service } from 'typedi';
import { Repository, Not, In, Between, IsNull } from 'typeorm';
import { DraftPickCalculator } from '../utility/DraftPickCalculator';
import { DraftRecommendation } from '../entities/DraftRecommendation';
import { DraftSession } from '../entities/DraftSession';
import { Player } from '../entities/Player';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { PlayerAnalysisService } from './PlayerAnalysisService';
import { 
    CreateDraftRecommendationInput, 
    UpdateDraftRecommendationInput,
    GenerateRecommendationsInput 
} from '../inputs/DraftRecommendationInput';
import { DraftPick } from '../types/DraftPick';
import { POSITION_TIER_THRESHOLDS } from '../config/positionStats';
import { RosterNeeds } from '../types/RosterNeeds';
import { RosterOptimizationService } from './RosterOptimizationService';

@Service()
export class DraftRecommendationService {
    private recommendationRepository: Repository<DraftRecommendation>;
    private sessionRepository: Repository<DraftSession>;
    private playerRepository: Repository<Player>;
    private redisService: RedisService;
    private userPicks: Map<number, DraftPick[]> = new Map(); // Store picks by sessionId
    private playerAnalysisService: PlayerAnalysisService;
    private rosterOptimizationService: RosterOptimizationService;

    constructor(playerAnalysisService: PlayerAnalysisService, rosterOptimizationService: RosterOptimizationService) {
        this.recommendationRepository = AppDataSource.getRepository(DraftRecommendation);
        this.sessionRepository = AppDataSource.getRepository(DraftSession);
        this.playerRepository = AppDataSource.getRepository(Player);
        this.redisService = RedisService.getInstance();
        this.playerAnalysisService = playerAnalysisService;
        this.rosterOptimizationService = rosterOptimizationService;
    }

    async initializeSession(
        sessionId: number, 
        firstRoundPick: number,
        isSnakeDraft: boolean = true
    ): Promise<void> {
        const picks = DraftPickCalculator.calculateAllPicks(
            firstRoundPick,
            54,  // totalRounds
            isSnakeDraft
        );
        this.userPicks.set(sessionId, picks);
    }

    private async getAvailablePlayers(sessionId: number): Promise<Player[]> {
        // Get drafted player IDs
        const draftedPlayerIds = await AppDataSource
            .createQueryBuilder()
            .select('player_id')
            .from('draft_picks', 'dp')
            .where('dp.session_id = :sessionId', { sessionId })
            .getRawMany();

        const draftedIds = draftedPlayerIds.map(p => p.player_id);

        // Get available players
        return this.playerRepository.find({
            where: draftedIds.length > 0 ? {
                id: Not(In(draftedIds))
            } : {},
            relations: {
                analysis: true,
                stats: true,
                ratings: true
            }
        });
    }

    private async clearRecommendationCache(id?: number, sessionId?: number) {
        if (id) {
            await this.redisService.del(`recommendation:${id}`);
        }
        if (sessionId) {
            await this.redisService.delByPattern(`recommendations:session:${sessionId}:*`);
        }
        await this.redisService.del('recommendations:all');
    }

    async findAll(): Promise<DraftRecommendation[]> {
        try {
            const cacheKey = 'recommendations:all';
            const cached = await this.redisService.get<DraftRecommendation[]>(cacheKey);
            
            if (cached) {
                return cached;
            }

            const recommendations = await this.recommendationRepository.find({
                relations: {
                    session: true,
                    player: true
                }
            });

            await this.redisService.set(cacheKey, recommendations);
            return recommendations;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<DraftRecommendation | null> {
        try {
            const cacheKey = `recommendation:${id}`;
            const cached = await this.redisService.get<DraftRecommendation>(cacheKey);

            if (cached) return cached;

            const recommendation = await this.recommendationRepository.findOne({
                where: { id },
                relations: {
                    session: true,
                    player: true
                }
            });

            if (recommendation) {
                await this.redisService.set(cacheKey, recommendation);
            }
            return recommendation;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findForPick(
        sessionId: number,
        roundNumber: number,
        pickNumber: number
    ): Promise<DraftRecommendation[]> {
        try {
            const cacheKey = `recommendations:session:${sessionId}:round:${roundNumber}:pick:${pickNumber}`;
            const cached = await this.redisService.get<DraftRecommendation[]>(cacheKey);

            if (cached) return cached;

            const recommendations = await this.recommendationRepository.find({
                where: {
                    session: { id: sessionId },
                    roundNumber,
                    pickNumber
                },
                relations: {
                    session: true,
                    player: {
                        stats: true,
                        analysis: true,
                        ratings: true
                    }
                },
                order: {
                    recommendationScore: 'DESC'
                }
            });

            await this.redisService.set(cacheKey, recommendations);
            return recommendations;
        } catch (error) {
            console.error('Error in findForPick:', error);
            throw error;
        }
    }

    private createRecommendation(
        input: GenerateRecommendationsInput,
        player: Player,
        recommendationScore: number
    ): DraftRecommendation {
        return this.recommendationRepository.create({
            session: { id: input.sessionId },
            player: { id: player.id },
            roundNumber: input.roundNumber,
            pickNumber: input.pickNumber,
            recommendationScore
        });
    }

    private async saveRecommendations(
        recommendations: DraftRecommendation[],
        limit: number
    ): Promise<DraftRecommendation[]> {
        // Sort by score and limit
        recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
        const limitedRecommendations = recommendations.slice(0, limit);

        // Save to database
        const saved = await this.recommendationRepository.save(limitedRecommendations);
        
        // Clear cache for this session
        if (saved.length > 0) {
            await this.clearRecommendationCache(undefined, saved[0].session.id);
        }
        
        return saved;
    }


    private getCurrentPick(sessionId: number, round: number, pick: number): DraftPick | undefined {
        const picks = this.userPicks.get(sessionId);
        if (!picks) {
            console.log(`No picks found for session ${sessionId}`); // Debug log
            return undefined;
        }
        
        const currentPick = picks.find(p => p.round === round);
        console.log(`Found pick for round ${round}:`, currentPick); // Debug log
        return currentPick;
    }

    async generate(input: GenerateRecommendationsInput): Promise<DraftRecommendation[]> {
        try {
            const session = await this.sessionRepository.findOneOrFail({
                where: { id: input.sessionId },
                relations: {
                    picks: {
                        player: {
                            analysis: true,
                            ratings: {
                                position: true
                            }
                        }
                    }
                }
            });
            // Get current roster optimization
            const currentRoster = this.rosterOptimizationService.optimizeRoster(session.picks ?? []);
            const positionNeeds = this.rosterOptimizationService.getPositionalNeeds(
                currentRoster,
                session.getRosterNeeds()
            );

            console.log('Current Roster State:', positionNeeds);
    
            // Initialize session if not already done
            if (!this.userPicks.has(input.sessionId)) {
                console.log('Initializing session...'); // Debug log
                await this.initializeSession(
                    input.sessionId,
                    session.draftPosition, // Use the stored draft position
                    input.isSnakeDraft
                );
            }
    
            // Get current pick info
            const currentPick = this.getCurrentPick(
                input.sessionId,
                input.roundNumber,
                input.pickNumber
            );
    
            if (!currentPick) {
                console.error('Failed to get current pick:', {
                    sessionId: input.sessionId,
                    round: input.roundNumber,
                    pick: input.pickNumber
                });
                throw new Error('Invalid pick position or session not initialized');
            }

            // Use overall pick from calculator
            const overallPick = currentPick.overall;

            // Calculate pick range based on round
            const baseRange = 10;
            const roundMultiplier = Math.ceil(input.roundNumber / 2);
            const pickRange = baseRange * roundMultiplier;
            
            // Calculate pick range - only look ahead, not behind
            const minPick = Math.max(1, overallPick - 10);  // At most 10 picks before
            const maxPick = overallPick + pickRange;        // Keep existing forward range

            console.log(`Round ${input.roundNumber}, Pick ${input.pickNumber} (Overall ${overallPick})`);
            console.log(`Looking for players between picks ${minPick} and ${maxPick}`);
    
            // Get available players with draft data within our range
            let availablePlayers = await this.playerRepository.find({
                relations: {
                    ratings: {
                        position: true,
                    },
                    draftData: true,
                    analysis: true
                },
                where: {
                    draftData: {
                        overall_pick: Between(minPick, maxPick)
                    }
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    ratings: {
                        id: true,
                        overallRating: true,
                        position: {
                            id: true,
                            name: true,
                            code: true
                        }
                    },
                    draftData: {
                        overall_pick: true,
                        round: true,
                        round_pick: true,
                        developmentTrait: true
                    },
                    analysis: {
                        id: true,  // Always include id for relations
                        normalizedScore: true,
                        adjustedScore: true,
                        positionTier: true,
                        secondaryPositions: true
                    }
                }
            });

            if (availablePlayers.length === 0) {
                console.log('No players found within pick range, expanding search...');
                // If no players found, try without the range restriction
                availablePlayers = await this.playerRepository.find({
                    relations: {
                        ratings: {
                            position: true,
                        },
                        draftData: true
                    },
                    where: {
                        draftData: Not(IsNull())  // Ensure we only get players with draft data
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        ratings: {
                            id: true,
                            overallRating: true,
                            position: {
                                id: true,
                                name: true,
                                code: true
                            }
                        },
                        draftData: {
                            overall_pick: true,
                            round: true,
                            round_pick: true,
                            developmentTrait: true
                        }
                    },
                    order: {
                        draftData: {
                            overall_pick: 'ASC'
                        }
                    },
                    take: input.limit
                });
            }
    
            const recommendations: DraftRecommendation[] = [];

            // Modify the scoring logic
            for (const player of availablePlayers) {
                const position = player.ratings?.[0]?.position?.name || 'Unknown Position';

                // Inside the for loop in generate method
                const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim();
                const analysis = player.analysis;  // Add this line
                
                // Calculate recommendation score with optimized roster consideration
                let recommendationScore = analysis?.adjustedScore || 0;
                recommendationScore = recommendationScore / 100;
    
                const scarcityMultiplier = await this.calculatePositionScarcity(
                    position,
                    availablePlayers,
                    overallPick,
                    session,
                    positionNeeds  // Pass the optimized position needs
                );
    
                const qualityMultiplier = await this.calculatePositionQuality(
                    player,
                    availablePlayers
                );
    
                const roundMultiplier = this.getDraftPositionValue(input.roundNumber);
    
                // Apply multipliers
                recommendationScore *= (1 + ((scarcityMultiplier - 1) * 0.3));
                recommendationScore *= (1 + ((qualityMultiplier - 1) * 0.3));
                recommendationScore *= roundMultiplier;
    
                // Consider secondary positions in recommendation
                if (player.analysis?.secondaryPositions) {
                    const secondaryBonus = this.calculateSecondaryPositionBonus(
                        player.analysis.secondaryPositions,
                        positionNeeds
                    );
                    recommendationScore *= (1 + secondaryBonus);
                }

            // Ensure score is valid but don't automatically cap at 1
            recommendationScore = Math.max(0, Math.min(recommendationScore, 1));

            console.log('Score Components:', {
                playerName,
                position,
                baseScore: analysis?.adjustedScore,
                normalizedBaseScore: analysis?.adjustedScore ? analysis.adjustedScore / 100 : 0,
                scarcityMultiplier,
                qualityMultiplier,
                roundMultiplier,
                finalScore: recommendationScore.toFixed(4)  // Show more decimal places
            });

                const recommendation = this.recommendationRepository.create({
                    session: { id: input.sessionId },
                    player: { id: player.id },
                    roundNumber: input.roundNumber,
                    pickNumber: input.pickNumber,
                    recommendationScore
                });

                recommendations.push(recommendation);
            }
    
            // Save all recommendations
            const savedRecommendations = await this.recommendationRepository.save(
                recommendations.slice(0, input.limit)  // Ensure we only save up to the limit
            );
        
            // Fetch the saved recommendations with all relations
            // Fetch the saved recommendations with all relations
            // Fetch the saved recommendations with all relations
            const recommendationsWithRelations = await this.recommendationRepository
                .createQueryBuilder('recommendation')
                .leftJoinAndSelect('recommendation.player', 'player')
                .leftJoinAndSelect('player.ratings', 'ratings')
                .leftJoinAndSelect('ratings.position', 'position')
                .leftJoinAndSelect('player.draftData', 'draftData')
                .leftJoinAndSelect('player.analysis', 'analysis')
                .where('recommendation.id IN (:...ids)', { 
                    ids: savedRecommendations.map(rec => rec.id) 
                })
                .orderBy('recommendation.recommendationScore', 'DESC')
                .take(input.limit)
                .getMany();

            // Enhance the recommendations with analysis data
            const enhancedRecommendations = recommendationsWithRelations.map(rec => {
                if (!rec.player || !rec.player.ratings || !rec.player.ratings.length) {
                    console.warn(`Missing player data for recommendation ${rec.id}`);
                    return rec;
                }
            
                const analysis = rec.player.analysis;
                const ratings = rec.player.ratings[0];
                const currentPosition = ratings?.position?.name || 'Unknown';
                const playerName = `${rec.player.firstName || ''} ${rec.player.lastName || ''}`.trim();
                
                // Create a more detailed reason string
                const reasonParts = [
                    `${currentPosition} - ${playerName}`,
                    `Projected: Pick ${rec.player.draftData?.overall_pick || 'Unknown'}, Rating: ${ratings?.overallRating || 'Unknown'}`
                ];
            
                rec.reason = reasonParts.join(' | ');
                return rec;
            });

            return enhancedRecommendations;
    
        } catch (error) {
            console.error('Error in generate:', error);
            throw error;
        }
    }

    private getDraftPositionValue(round: number): number {
        // For a 54-round draft, we want a more gradual decline
        // Start at 1.0 and decrease by 0.015 per round
        // This gives us a range from 1.0 (round 1) to about 0.2 (round 54)
        const baseValue = 1.0;
        const decreasePerRound = 0.015;
        const multiplier = baseValue - ((round - 1) * decreasePerRound);
        
        // Ensure we don't go below 0.2 (20% value) for very late rounds
        return Math.max(0.2, multiplier);
    }

    private calculateSecondaryPositionBonus(
        secondaryPositions: Array<{
            position: string;
            score: number;
            tier: number;
            isElite: boolean;
        }>,
        positionNeeds: Record<string, { needed: number; priority: number }>
    ): number {
        let bonus = 0;
        
        for (const sp of secondaryPositions) {
            if (sp.isElite || sp.tier <= 2) {  // Only consider elite or high-tier secondary positions
                const need = positionNeeds[sp.position];
                if (need && need.needed > 0) {
                    // Add bonus based on need and position quality
                    bonus += (0.1 * need.priority * (sp.isElite ? 1.5 : 1.0));
                }
            }
        }
    
        return Math.min(0.3, bonus);  // Cap total bonus at 30%
    }

    private async calculatePositionScarcity(
        position: string,
        availablePlayers: Player[],
        overallPick: number,
        session: DraftSession,
        positionNeeds: Record<string, { needed: number; priority: number }>
    ): Promise<number> {
        // Get base scarcity calculation
        let scarcityMultiplier = await this.calculateBasePositionScarcity(
            position,
            availablePlayers,
            overallPick,
            session
        );
    
        // Adjust based on optimized roster needs
        const positionNeed = positionNeeds[position];
        if (positionNeed) {
            scarcityMultiplier *= positionNeed.priority;
        }
    
        return scarcityMultiplier;
    }

    private async calculateBasePositionScarcity(
        position: string,
        availablePlayers: Player[],
        overallPick: number,
        session: DraftSession
    ): Promise<number> {
        // Get roster needs
        const rosterNeeds = session.getRosterNeeds();
        const positionNeeds = rosterNeeds[position as keyof typeof rosterNeeds];
    
        // Count unfilled minimum requirements across all positions
        const unfilledPositions = Object.entries(rosterNeeds)
            .filter(([_, needs]) => (needs as { current: number; min: number }).current < (needs as { current: number; min: number }).min)
            .map(([pos]) => pos);
    
        const totalUnfilledPositions = unfilledPositions.length;
        
        // Calculate talent-based scarcity
        const positionPlayers = availablePlayers.filter(p => 
            p.ratings?.[0]?.position?.name === position
        );
    
        // Get position-specific thresholds
        const thresholds = POSITION_TIER_THRESHOLDS[position as keyof typeof POSITION_TIER_THRESHOLDS];
        if (!thresholds) return 1.0;
    
        // Count players at each tier
        const tier1Players = positionPlayers.filter(p => 
            (p.analysis?.adjustedScore || 0) >= thresholds.tier1
        ).length;
    
        const tier2Players = positionPlayers.filter(p => 
            (p.analysis?.adjustedScore || 0) >= thresholds.tier2
        ).length;
    
        const tier3Players = positionPlayers.filter(p => 
            (p.analysis?.adjustedScore || 0) >= thresholds.tier3
        ).length;
    
        // Calculate base scarcity multiplier from talent availability
        let scarcityMultiplier = 1.0;
        if (tier1Players === 0) scarcityMultiplier = 1.5;
        else if (tier1Players <= 2) scarcityMultiplier = 1.4;
        else if (tier2Players <= 5) scarcityMultiplier = 1.3;
        else if (tier3Players <= 10) scarcityMultiplier = 1.2;
    
        // Adjust for roster needs with stronger modifiers
        if (positionNeeds) {
            if (positionNeeds.current < positionNeeds.min) {
                // Boost unfilled positions more aggressively
                const remainingNeeded = positionNeeds.min - positionNeeds.current;
                scarcityMultiplier *= (1.5 + (0.1 * remainingNeeded));  // Increased from 1.2
                
                // Extra boost if this is one of few remaining unfilled positions
                if (totalUnfilledPositions <= 3) {
                    scarcityMultiplier *= 1.3;  // Priority boost for last few positions
                }
            } else if (positionNeeds.current >= positionNeeds.max) {
                scarcityMultiplier *= 0.3;  // Stronger penalty (was 0.5)
            } else if (positionNeeds.current >= positionNeeds.min) {
                // More aggressive penalty when minimums aren't met elsewhere
                const penaltyMultiplier = Math.min(0.8, 0.9 - (0.05 * totalUnfilledPositions));
                scarcityMultiplier *= penaltyMultiplier;
            }
    
            // Apply urgent positions penalty
            if (unfilledPositions.length > 0 && !unfilledPositions.includes(position)) {
                // Stronger penalty when position is already filled and others need attention
                scarcityMultiplier *= (1 - (0.15 * unfilledPositions.length));
            }
        }
    
        console.log('Position Scarcity:', {
            position,
            tier1Count: tier1Players,
            tier2Count: tier2Players,
            tier3Count: tier3Players,
            currentRoster: positionNeeds?.current || 0,
            minNeeded: positionNeeds?.min || 0,
            maxAllowed: positionNeeds?.max || 0,
            unfilledPositions,
            totalUnfilledPositions,
            scarcityMultiplier
        });
    
        return scarcityMultiplier;
    }

    private async calculatePositionQuality(
        player: Player,
        availablePlayers: Player[]
    ): Promise<number> {
        const position = player.ratings?.[0]?.position?.name;
        if (!position) return 1.0;

        // Get all players at this position
        const positionPlayers = availablePlayers.filter(p => 
            p.ratings?.[0]?.position?.name === position
        );

        // Calculate player's percentile rank at their position
        const betterPlayers = positionPlayers.filter(p => 
            (p.analysis?.adjustedScore || 0) > (player.analysis?.adjustedScore || 0)
        ).length;

        const percentileRank = 1 - (betterPlayers / positionPlayers.length);
        
        // Return quality multiplier based on percentile
        if (percentileRank >= 0.9) return 1.4;  // Top 10%
        if (percentileRank >= 0.8) return 1.2;  // Top 20%
        if (percentileRank >= 0.6) return 1.1;  // Top 40%
        return 1.0;
    }

    async create(input: CreateDraftRecommendationInput): Promise<DraftRecommendation> {
        try {
            const recommendation = this.recommendationRepository.create({
                session: { id: input.sessionId },
                player: { id: input.playerId },
                roundNumber: input.roundNumber,
                pickNumber: input.pickNumber,
                recommendationScore: input.recommendationScore,
                reason: input.reason
            });

            const saved = await this.recommendationRepository.save(recommendation);
            await this.clearRecommendationCache(undefined, input.sessionId);
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdateDraftRecommendationInput): Promise<DraftRecommendation> {
        try {
            const recommendation = await this.recommendationRepository.findOneOrFail({
                where: { id },
                relations: {
                    session: true,
                    player: true
                }
            });

            if (input.recommendationScore !== undefined) {
                recommendation.recommendationScore = input.recommendationScore;
            }
            if (input.reason) {
                recommendation.reason = input.reason;
            }

            const updated = await this.recommendationRepository.save(recommendation);
            await this.clearRecommendationCache(id, recommendation.session.id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const recommendation = await this.recommendationRepository.findOne({
                where: { id },
                relations: ['session']
            });
            
            if (recommendation) {
                const result = await this.recommendationRepository.delete(id);
                await this.clearRecommendationCache(id, recommendation.session.id);
                return !!result.affected;
            }
            return false;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            throw error;
        }
    }
}