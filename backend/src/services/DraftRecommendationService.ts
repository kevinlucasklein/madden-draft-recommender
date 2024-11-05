import { Service } from 'typedi';
import { Repository, Not, In, Between, IsNull } from 'typeorm';
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

@Service()
export class DraftRecommendationService {
    private recommendationRepository: Repository<DraftRecommendation>;
    private sessionRepository: Repository<DraftSession>;
    private playerRepository: Repository<Player>;
    private redisService: RedisService;
    private playerAnalysisService: PlayerAnalysisService;

    constructor(playerAnalysisService: PlayerAnalysisService) {
        this.recommendationRepository = AppDataSource.getRepository(DraftRecommendation);
        this.sessionRepository = AppDataSource.getRepository(DraftSession);
        this.playerRepository = AppDataSource.getRepository(Player);
        this.redisService = RedisService.getInstance();
        this.playerAnalysisService = playerAnalysisService;
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


    async generate(input: GenerateRecommendationsInput): Promise<DraftRecommendation[]> {
        try {
            const session = await this.sessionRepository.findOneOrFail({
                where: { id: input.sessionId }
            });
    
            // Calculate overall pick number
            const overallPick = this.calculateOverallPick(
                input.roundNumber,
                input.pickNumber,
                input.totalTeams,
                input.isSnakeDraft
            );
    
            // Calculate a reasonable range for picks (e.g., +/- 20 picks from current position)
            const pickRange = 20;
            const minPick = Math.max(1, overallPick - pickRange);
            const maxPick = overallPick + pickRange;
    
            // Get available players with draft data within our range
            let availablePlayers = await this.playerRepository.find({
                relations: {
                    ratings: {
                        position: true,
                    },
                    draftData: true
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
                    }
                },
                order: {
                    draftData: {
                        overall_pick: 'ASC'
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

            for (const player of availablePlayers) {
                const position = player.ratings?.[0]?.position?.name || 'Unknown Position';
                const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Unknown Player';
                
                // Calculate recommendation score based on draft position proximity
                const playerOverallPick = player.draftData?.overall_pick || 0;
                const pickDifference = Math.abs(playerOverallPick - overallPick);
                
                // Score decreases as the difference in pick position increases
                const recommendationScore = Math.exp(-pickDifference / 10);
    
                const recommendation = this.recommendationRepository.create({
                    session: { id: input.sessionId },
                    player: { id: player.id },
                    roundNumber: input.roundNumber,
                    pickNumber: input.pickNumber,
                    recommendationScore,
                    reason: `${position} - ${playerName} (Projected: Overall Pick ${playerOverallPick})`
                });
    
                recommendations.push(recommendation);
            }
    
            // Save all recommendations
            const savedRecommendations = await this.recommendationRepository.save(
                recommendations.slice(0, input.limit)  // Ensure we only save up to the limit
            );
        
            // Fetch the saved recommendations with all relations
            const recommendationsWithRelations = await this.recommendationRepository.find({
                where: {
                    id: In(savedRecommendations.map(rec => rec.id))
                },
                relations: {
                    player: {
                        ratings: {
                            position: true
                        },
                        draftData: true
                    }
                },
                order: {
                    recommendationScore: 'DESC'
                },
                take: input.limit
            });
    
            return recommendationsWithRelations;
        } catch (error) {
            console.error('Error in generate:', error);
            throw error;
        }
    }
    
    // Helper method to calculate overall pick number
    private calculateOverallPick(round: number, pick: number, totalTeams: number, isSnakeDraft: boolean): number {
        if (!isSnakeDraft) {
            // For standard draft, it's just (round - 1) * totalTeams + pick
            return (round - 1) * totalTeams + pick;
        } else {
            // For snake draft, even-numbered rounds go in reverse
            if (round % 2 === 1) {
                // Odd rounds go forward
                return (round - 1) * totalTeams + pick;
            } else {
                // Even rounds go backward
                return (round - 1) * totalTeams + (totalTeams - pick + 1);
            }
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
    
        async generateRecommendations(
            sessionId: number,
            round: number,
            pick: number,
            totalTeams: number,
            isSnakeDraft: boolean,
            limit: number = 5
        ): Promise<DraftRecommendation[]> {
            try {
                // Calculate overall pick number
                const overallPick = this.calculateOverallPick(round, pick, totalTeams, isSnakeDraft);
        
                // Get available players with draft data
                const availablePlayers = await this.playerRepository.find({
                    relations: {
                        draftData: true,
                        position: true,
                        ratings: true
                    },
                    order: {
                        draftData: {
                            overall_pick: 'ASC'
                        }
                    }
                });
        
                const recommendations: DraftRecommendation[] = [];
        
                for (const player of availablePlayers) {
                    // Calculate score based on historical draft position proximity
                    const pickDifference = Math.abs((player.draftData?.overall_pick ?? 0) - overallPick);
                    const recommendationScore = 1 / (1 + pickDifference * 0.1);
        
                    recommendations.push(this.createRecommendation({
                        sessionId,
                        roundNumber: round,
                        pickNumber: pick,
                        totalTeams,        // Add this
                        isSnakeDraft,      // Add this
                        limit
                    }, player, recommendationScore));
                }
        
                return this.saveRecommendations(recommendations, limit);
            } catch (error) {
                console.error('Error generating recommendations:', error);
                throw error;
            }
    }
}