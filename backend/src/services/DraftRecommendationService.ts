import { Service } from 'typedi';
import { Repository, Not, In } from 'typeorm';
import { DraftRecommendation } from '../entities/DraftRecommendation';
import { DraftSession } from '../entities/DraftSession';
import { Player } from '../entities/Player';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
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

    constructor() {
        this.recommendationRepository = AppDataSource.getRepository(DraftRecommendation);
        this.sessionRepository = AppDataSource.getRepository(DraftSession);
        this.playerRepository = AppDataSource.getRepository(Player);
        this.redisService = RedisService.getInstance();
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

    async generate(input: GenerateRecommendationsInput): Promise<DraftRecommendation[]> {
        try {
            // Get the draft session and its needs
            const session = await this.sessionRepository.findOneOrFail({
                where: { id: input.sessionId }
            });

            // Get drafted player IDs
            const draftedPlayerIds = await AppDataSource
                .createQueryBuilder()
                .select('player_id')
                .from('draft_picks', 'dp')
                .where('dp.session_id = :sessionId', { sessionId: input.sessionId })
                .getRawMany();

            const draftedIds = draftedPlayerIds.map(p => p.player_id);

            // Get available players
            const availablePlayers = await this.playerRepository.find({
                where: draftedIds.length > 0 ? {
                    id: Not(In(draftedIds))
                } : {},
                relations: {
                    analysis: true,
                    stats: true,
                    ratings: true
                }
            });

            // Calculate recommendations
            const recommendations: DraftRecommendation[] = [];
            const rosterNeeds = JSON.parse(session.rosterNeeds) as Record<string, number>;

            for (const player of availablePlayers) {
                if (!player.analysis?.normalizedScore) continue;

                let recommendationScore = player.analysis.normalizedScore;
                
                if (player.analysis.suggestedPosition) {
                    const positionNeed = rosterNeeds[player.analysis.suggestedPosition] || 0;
                    recommendationScore *= (positionNeed > 0 ? 1.2 : 0.8);
                }

                const recommendation = this.recommendationRepository.create({
                    session: { id: input.sessionId },
                    player: { id: player.id },
                    roundNumber: input.roundNumber,
                    pickNumber: input.pickNumber,
                    recommendationScore,
                    reason: player.analysis.suggestedPosition 
                        ? `${player.analysis.suggestedPosition} - ${player.analysis.playerType || 'Unknown Type'}`
                        : 'Position not specified'
                });

                recommendations.push(recommendation);
            }

            recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
            const limitedRecommendations = recommendations.slice(0, input.limit || 10);

            const saved = await this.recommendationRepository.save(limitedRecommendations);
            await this.clearRecommendationCache(undefined, input.sessionId);
            return saved;
        } catch (error) {
            console.error('Error in generate:', error);
            throw error;
        }
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