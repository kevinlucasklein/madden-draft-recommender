import { Service } from 'typedi';
import { Repository, Not, In } from 'typeorm';
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

            // Get available players
            const availablePlayers = await this.getAvailablePlayers(input.sessionId);
            const rosterNeeds = JSON.parse(session.rosterNeeds) as Record<string, number>;
            const recommendations: DraftRecommendation[] = [];

            for (const player of availablePlayers) {
                // Ensure player has been analyzed
                if (!player.analysis) {
                    await this.playerAnalysisService.analyzePlayer(player.id);
                }

                let recommendationScore = player.analysis.normalizedScore;
                
                // Adjust score based on roster needs
                if (player.analysis.suggestedPosition) {
                    const positionNeed = rosterNeeds[player.analysis.suggestedPosition] || 0;
                    const needMultiplier = this.calculateNeedMultiplier(positionNeed);
                    recommendationScore *= needMultiplier;
                }

                // Adjust for draft position value
                recommendationScore *= this.getDraftPositionValue(input.roundNumber);

                recommendations.push(this.createRecommendation(
                    input,
                    player,
                    recommendationScore
                ));
            }

            return this.saveRecommendations(recommendations, input.limit || 10);
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