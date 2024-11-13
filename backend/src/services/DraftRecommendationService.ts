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

    private async getNextUserPick(
        sessionId: number, 
        currentRound: number, 
        currentOverallPick: number
    ): Promise<DraftPick | undefined> {
        const picks = this.userPicks.get(sessionId);
        if (!picks) return undefined;
    
        // Find next pick after current overall pick
        return picks.find(p => p.overall > currentOverallPick);
    }

    private async analyzeDraftValueOpportunity(
        player: Player,
        availablePlayers: Player[],
        currentOverallPick: number,
        nextUserPick: DraftPick | undefined
    ): Promise<{
        multiplier: number;
        reason: string;
    }> {
        if (!nextUserPick || !player.draftData) {
            return { multiplier: 1.0, reason: "No next pick data available" };
        }
    
        const position = player.ratings?.[0]?.position?.name;
        const projectedPick = player.draftData.overall_pick;
        const picksBetween = nextUserPick.overall - currentOverallPick;
    
        // If player is projected to be available at next pick, heavily penalize
        if (projectedPick >= nextUserPick.overall) {
            return {
                multiplier: 0.1, // This will effectively remove them from recommendations
                reason: `Should be available at pick #${nextUserPick.overall}`
            };
        }
    
        // Find quality players at same position available at next pick
        const availableAtNextPick = availablePlayers.filter(p => 
            p.ratings?.[0]?.position?.name === position &&
            p.draftData &&
            p.draftData.overall_pick >= nextUserPick.overall &&
            p.analysis?.adjustedScore && 
            p.analysis.adjustedScore > 75  // Only count quality players
        );
    
        // Calculate talent drop-off
        const currentTierPlayers = availablePlayers.filter(p =>
            p.ratings?.[0]?.position?.name === position &&
            p.draftData &&
            p.draftData.overall_pick <= currentOverallPick &&
            p.analysis?.adjustedScore &&
            p.analysis.adjustedScore > 75
        );
    
        // Special QB Analysis
        if (position === 'QB') {
            const eliteQBsAvailable = availablePlayers.filter(p => 
                p.ratings?.[0]?.position?.name === 'QB' &&
                p.analysis?.adjustedScore &&
                p.analysis.adjustedScore > 85
            );

            // If this is an elite QB (Mahomes, Jackson, Allen)
            if (player.analysis?.adjustedScore && player.analysis.adjustedScore > 85) {
                const urgencyMultiplier = 2.0 + (picksBetween / 100);  // Increased from 1.6
                return {
                    multiplier: urgencyMultiplier,
                    reason: 'Elite QB talent - must draft now'
                };
            }

            // If this is a good QB (Stroud, Hurts)
            if (player.analysis?.adjustedScore && player.analysis.adjustedScore > 80) {
                const urgencyMultiplier = 1.5 + (picksBetween / 100);  // Increased from 1.3
                return {
                    multiplier: urgencyMultiplier,
                    reason: 'Quality QB likely gone by next pick'
                };
            }
        }
    
        // Premium position analysis (non-QB)
        const premiumPositions = ['LT', 'EDGE', 'CB'];
        const isPremiumPosition = premiumPositions.includes(position || '');
    
        // Calculate urgency multiplier
        let urgencyMultiplier = 1.0;
        let reason = '';
    
        if (projectedPick < nextUserPick.overall) {
            // Base urgency from picks between
            urgencyMultiplier = 1 + (picksBetween / 100);
    
            // Add premium position bonus
            if (isPremiumPosition) {
                urgencyMultiplier *= 1.2;
            }
    
            // Add talent drop-off multiplier
            if (availableAtNextPick.length === 0 && currentTierPlayers.length > 0) {
                urgencyMultiplier *= 1.3;
                reason = `Last ${position} of this tier before pick #${nextUserPick.overall}`;
            } else {
                reason = `Likely gone by next pick (#${nextUserPick.overall})`;
            }
    
            return { multiplier: urgencyMultiplier, reason };
        }
    
        // If available later, but it's a premium position with limited options
        if (isPremiumPosition && availableAtNextPick.length <= 1) {
            return {
                multiplier: 0.85,
                reason: `Might be available at #${nextUserPick.overall} but limited options remain`
            };
        }
    
        // Standard availability at next pick
        return {
            multiplier: 0.7,
            reason: `Should be available at pick #${nextUserPick.overall}`
        };
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
            // Get drafted player IDs
            const draftedPlayerIds = (session.picks ?? [])
                .filter(pick => pick.player)
                .map(pick => pick.player.id);

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

            const overallPick = currentPick.overall;  // 12
            const nextPick = await this.getNextUserPick(
                input.sessionId,
                input.roundNumber,
                currentPick.overall
            );  // Would be #21 (2nd round)
            
            // Calculate pick range
            const minPick = Math.max(1, overallPick - 7);
            const maxPick = nextPick ? nextPick.overall - 1 : overallPick + 10; // Fallback if no next pick

            console.log(`Round ${input.roundNumber}, Pick ${input.pickNumber} (Overall ${overallPick})`);
            console.log(`Looking for players between picks ${minPick} and ${maxPick}`);
    
            // Get available players with draft data within our range
            // Modified query to exclude drafted players
            // Inside generate method, modify the player query:
            let availablePlayers = await this.playerRepository.find({
                relations: {
                    ratings: {
                        position: true,
                    },
                    draftData: true,
                    analysis: true
                },
                where: [
                    {
                        id: Not(In(draftedPlayerIds)),  // Exclude drafted players
                        draftData: {
                            overall_pick: Between(
                                Math.max(1, overallPick - 7),  // Only look 7 picks back
                                maxPick
                            )
                        }
                    }
                ],
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

            // Modified fallback query
            if (availablePlayers.length === 0) {
                console.log('No players found within pick range, expanding search...');
                availablePlayers = await this.playerRepository.find({
                    relations: {
                        ratings: {
                            position: true,
                        },
                        draftData: true
                    },
                    where: [
                        {
                            id: Not(In(draftedPlayerIds)),  // Exclude drafted players
                            draftData: Not(IsNull())
                        }
                    ],
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

            // Inside generate method, modify the scoring section:
            for (const player of availablePlayers) {
                const position = player.ratings?.[0]?.position?.name || 'Unknown Position';
                const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim();
                const analysis = player.analysis;

                // Start with base score (0-1 scale)
                let recommendationScore = (analysis?.adjustedScore || 0) / 100;

                // Get next pick information
                const nextPick = await this.getNextUserPick(
                    input.sessionId,
                    input.roundNumber,
                    currentPick.overall
                );

                // Get all multipliers
                const scarcityMultiplier = await this.calculatePositionScarcity(
                    position,
                    availablePlayers,
                    overallPick,
                    session,
                    positionNeeds
                );

                const qualityMultiplier = await this.calculatePositionQuality(
                    player,
                    availablePlayers
                );

                const roundMultiplier = this.getDraftPositionValue(input.roundNumber);

                const { multiplier: valueOpportunityMultiplier, reason: valueReason } = 
                    await this.analyzeDraftValueOpportunity(
                        player,
                        availablePlayers,
                        currentPick.overall,
                        nextPick
                    );

                // Apply weighted adjustments
                recommendationScore = (
                    // Base score (70% weight)
                    (recommendationScore * 0.70) +
                    // Position need & scarcity (20% weight)
                    (recommendationScore * (scarcityMultiplier - 1) * 0.20) +
                    // Draft value opportunity (10% weight)
                    (recommendationScore * (valueOpportunityMultiplier - 1) * 0.10)
                );

                // Apply sigmoid function
                recommendationScore = 1 / (1 + Math.exp(-5 * (recommendationScore - 0.5)));

                console.log('Score Components:', {
                    playerName,
                    position,
                    baseScore: (analysis?.adjustedScore || 0) / 100,
                    projectedPick: player.draftData?.overall_pick,
                    nextUserPick: nextPick?.overall,
                    scarcityComponent: (scarcityMultiplier - 1) * 0.20,
                    qualityComponent: (qualityMultiplier - 1) * 0.15,
                    roundComponent: (roundMultiplier - 1) * 0.10,
                    valueComponent: (valueOpportunityMultiplier - 1) * 0.05,
                    valueReason,
                    finalScore: recommendationScore.toFixed(4)
                });

                // Update the reason string to include draft value information
                const reasonParts = [
                    `${position} - ${playerName}`,
                    `Projected: Pick ${player.draftData?.overall_pick || 'Unknown'}, Rating: ${player.ratings?.[0]?.overallRating || 'Unknown'}`,
                    valueReason
                ];

                const recommendation = this.recommendationRepository.create({
                    session: { id: input.sessionId },
                    player: { id: player.id },
                    roundNumber: input.roundNumber,
                    pickNumber: input.pickNumber,
                    recommendationScore,
                    reason: reasonParts.join(' | ')
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

        // If we don't need any more at this position, apply heavy penalty
        if (positionNeeds && positionNeeds.needed <= 0) {
            return 0.3;  // Strong penalty for positions we don't need
        }
    
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
        if (tier1Players === 0) scarcityMultiplier = 1.3;      // Reduced from 1.5
        else if (tier1Players <= 2) scarcityMultiplier = 1.25; // Reduced from 1.4
        else if (tier2Players <= 5) scarcityMultiplier = 1.2;  // Reduced from 1.3
        else if (tier3Players <= 10) scarcityMultiplier = 1.15; // Reduced from 1.2
    
        // Adjust for roster needs with stronger modifiers
        // Adjust for roster needs with more balanced modifiers
        if (positionNeeds) {
            if (positionNeeds.current < positionNeeds.min) {
                const remainingNeeded = positionNeeds.min - positionNeeds.current;
                scarcityMultiplier *= (1.2 + (0.05 * remainingNeeded));  // Reduced from 1.5 + 0.1
                
                if (totalUnfilledPositions <= 3) {
                    scarcityMultiplier *= 1.15;  // Reduced from 1.3
                }
            } else if (positionNeeds.current >= positionNeeds.max) {
                scarcityMultiplier *= 0.5;  // Less severe penalty
            } else if (positionNeeds.current >= positionNeeds.min) {
                const penaltyMultiplier = Math.min(0.9, 0.95 - (0.025 * totalUnfilledPositions));
                scarcityMultiplier *= penaltyMultiplier;
            }

            // Reduced urgent positions penalty
            if (unfilledPositions.length > 0 && !unfilledPositions.includes(position)) {
                scarcityMultiplier *= (1 - (0.075 * unfilledPositions.length));  // Reduced from 0.15
            }
        }

            // Special case for QB
        // For QBs, increase base scarcity
        if (position === 'QB' && tier1Players <= 4) {
            scarcityMultiplier = 2.6; 
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
    
        const positionPlayers = availablePlayers.filter(p => 
            p.ratings?.[0]?.position?.name === position
        );
    
        const betterPlayers = positionPlayers.filter(p => 
            (p.analysis?.adjustedScore || 0) > (player.analysis?.adjustedScore || 0)
        ).length;
    
        const percentileRank = 1 - (betterPlayers / positionPlayers.length);
        
        // More balanced multipliers
        if (percentileRank >= 0.9) return 1.25;  // Elite talent
        if (percentileRank >= 0.8) return 1.2;   // Top talent
        if (percentileRank >= 0.6) return 1.15;  // Good talent
        return 1.0;
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
            if (sp.isElite || sp.tier <= 2) {
                const need = positionNeeds[sp.position];
                if (need && need.needed > 0) {
                    // Reduced bonus
                    bonus += (0.05 * need.priority * (sp.isElite ? 1.3 : 1.0));
                }
            }
        }
    
        return Math.min(0.15, bonus);  // Cap reduced to 15% (was 30%)
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