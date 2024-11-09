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

@Service()
export class DraftRecommendationService {
    private recommendationRepository: Repository<DraftRecommendation>;
    private sessionRepository: Repository<DraftSession>;
    private playerRepository: Repository<Player>;
    private redisService: RedisService;
    private userPicks: Map<number, DraftPick[]> = new Map(); // Store picks by sessionId
    private playerAnalysisService: PlayerAnalysisService;

    constructor(playerAnalysisService: PlayerAnalysisService) {
        this.recommendationRepository = AppDataSource.getRepository(DraftRecommendation);
        this.sessionRepository = AppDataSource.getRepository(DraftSession);
        this.playerRepository = AppDataSource.getRepository(Player);
        this.redisService = RedisService.getInstance();
        this.playerAnalysisService = playerAnalysisService;
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
            recommendationScore,
            reason: player.analysis?.suggestedPosition 
                ? `${player.analysis.suggestedPosition} - ${player.analysis.playerType || 'Unknown Type'}`
                : 'Position not specified'
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
                where: { id: input.sessionId }
            });
    
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
                        round_pick: true
                    },
                    analysis: {
                        id: true,  // Always include id for relations
                        bestPosition: true,
                        normalizedScore: true,
                        viablePositionCount: true,
                        primaryArchetype: true,
                        secondaryArchetype: true,
                        specialTraits: true,
                        versatilePositions: true
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
                            round_pick: true
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
                const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Unknown Player';
                
            // Get analysis data with type checks
            const analysis = player.analysis;
            const positionScores = analysis?.positionScores || {};
            const bestPosition = analysis?.bestPosition;

            // Use the best position score as the recommendation score
            let recommendationScore = 0;

            // Safely check for viable positions
            if (analysis && 
                'viablePositions' in analysis && 
                Array.isArray(analysis.viablePositions) && 
                analysis.viablePositions.length > 0) {
                
                // Find the highest position score
                const scores = analysis.viablePositions
                    .map(vp => typeof vp.score === 'number' ? vp.score : 0);
                
                recommendationScore = Math.max(...scores) / 100; // Convert to 0-1 scale
            }

            // Ensure score is valid
            recommendationScore = Math.max(0, Math.min(recommendationScore, 1)) || 0;

            console.log('Score Components:', {
                playerName,
                bestPosition,
                recommendationScore,
                viablePositions: analysis?.viablePositions || []
            });

                const recommendation = this.recommendationRepository.create({
                    session: { id: input.sessionId },
                    player: { id: player.id },
                    roundNumber: input.roundNumber,
                    pickNumber: input.pickNumber,
                    recommendationScore,
                    reason: `${position} - ${playerName} (Projected: Pick ${player.draftData?.overall_pick}, Rating: ${player.ratings?.[0]?.overallRating})
                            ${bestPosition !== position ? `Best Position: ${bestPosition}` : ''}
                            ${analysis?.primaryArchetype ? `Type: ${analysis.primaryArchetype}` : ''}`
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
            
                if (analysis) {
                    if (analysis.bestPosition && analysis.bestPosition !== currentPosition) {
                        reasonParts.push(`Best Position: ${analysis.bestPosition}`);
                    }
            
                    if (analysis.primaryArchetype) {
                        reasonParts.push(`Primary Type: ${analysis.primaryArchetype}`);
                    }
            
                    if (analysis.secondaryArchetype) {
                        reasonParts.push(`Secondary Type: ${analysis.secondaryArchetype}`);
                    }
            
                    if (Array.isArray(analysis.viablePositions) && analysis.viablePositions.length > 0) {
                        const viablePositionsText = analysis.viablePositions
                            .map(vp => `${vp.position} (${Number(vp.score).toFixed(1)})`)
                            .join(', ');
                        reasonParts.push(`Viable at: ${viablePositionsText}`);
                    }
            
                    if (Array.isArray(analysis.specialTraits) && analysis.specialTraits.length > 0) {
                        reasonParts.push(`Traits: ${analysis.specialTraits.join(', ')}`);
                    }
                }
            
                rec.reason = reasonParts.join(' | ');
                return rec;
            });

            return enhancedRecommendations;
    
        } catch (error) {
            console.error('Error in generate:', error);
            throw error;
        }
    }
    

    private calculateNeedMultiplier(positionNeed: number): number {
        if (positionNeed > 2) return 1.3;  // Desperate need
        if (positionNeed > 1) return 1.2;  // Strong need
        if (positionNeed > 0) return 1.1;  // Some need
        return 0.8;  // No need
    }

    private getDraftPositionValue(round: number): number {
        // Adjust scores based on draft position expectations
        return 1 - ((round - 1) * 0.1);  // Decrease expectations in later rounds
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