import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerAnalysisInput, UpdatePlayerAnalysisInput } from '../inputs/PlayerAnalysisInput';

@Service()
export class PlayerAnalysisService {
    private analysisRepository: Repository<PlayerAnalysis>;
    private redisService: RedisService;

    constructor() {
        this.analysisRepository = AppDataSource.getRepository(PlayerAnalysis);
        this.redisService = RedisService.getInstance();
    }

    private async clearAnalysisCache(id?: number, playerId?: number) {
        if (id) {
            await this.redisService.del(`analysis:${id}`);
        }
        if (playerId) {
            await this.redisService.del(`analysis:player:${playerId}`);
        }
        await this.redisService.del('analyses:all');
    }

    async findAll(): Promise<PlayerAnalysis[]> {
        try {
            const cacheKey = 'analyses:all';
            const cached = await this.redisService.get<PlayerAnalysis[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached player analyses');
                return cached;
            }

            console.log('Fetching player analyses from database');
            const analyses = await this.analysisRepository.find({
                relations: {
                    player: true,
                    rating: true
                },
                order: {
                    rank: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, analyses);
            return analyses;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<PlayerAnalysis | null> {
        try {
            const cacheKey = `analysis:${id}`;
            const cached = await this.redisService.get<PlayerAnalysis>(cacheKey);

            if (cached) return cached;

            const analysis = await this.analysisRepository.findOne({
                where: { id },
                relations: {
                    player: true,
                    rating: true
                }
            });

            if (analysis) {
                await this.redisService.set(cacheKey, analysis);
            }
            return analysis;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findByPlayer(playerId: number): Promise<PlayerAnalysis | null> {
        try {
            const cacheKey = `analysis:player:${playerId}`;
            const cached = await this.redisService.get<PlayerAnalysis>(cacheKey);

            if (cached) return cached;

            const analysis = await this.analysisRepository.findOne({
                where: {
                    player: { id: playerId }
                },
                relations: {
                    player: true,
                    rating: true
                }
            });

            if (analysis) {
                await this.redisService.set(cacheKey, analysis);
            }
            return analysis;
        } catch (error) {
            console.error(`Error in findByPlayer for playerId ${playerId}:`, error);
            return null;
        }
    }

    async create(input: CreatePlayerAnalysisInput): Promise<PlayerAnalysis> {
        try {
            const analysis = this.analysisRepository.create({
                player: { id: input.playerId },
                rating: input.ratingId ? { id: input.ratingId } : undefined,
                ...input
            });

            const saved = await this.analysisRepository.save(analysis);
            await this.clearAnalysisCache(undefined, input.playerId);
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdatePlayerAnalysisInput): Promise<PlayerAnalysis> {
        try {
            const analysis = await this.analysisRepository.findOneOrFail({
                where: { id },
                relations: {
                    player: true,
                    rating: true
                }
            });

            Object.assign(analysis, input);

            if (input.ratingId !== undefined) {
                analysis.rating = input.ratingId ? { id: input.ratingId } as any : undefined;
            }

            const updated = await this.analysisRepository.save(analysis);
            await this.clearAnalysisCache(id, analysis.player.id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const analysis = await this.analysisRepository.findOne({
                where: { id },
                relations: ['player']
            });
            
            if (analysis) {
                const result = await this.analysisRepository.delete(id);
                await this.clearAnalysisCache(id, analysis.player.id);
                return !!result.affected;
            }
            return false;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            return false;
        }
    }

    async updateRanks(): Promise<void> {
        try {
            const analyses = await this.analysisRepository.find({
                order: {
                    normalizedScore: 'DESC'
                }
            });

            const updates = analyses.map((analysis, index) => {
                analysis.rank = index + 1;
                return analysis;
            });

            await this.analysisRepository.save(updates);
            await this.clearAnalysisCache();
        } catch (error) {
            console.error('Error in updateRanks:', error);
            throw error;
        }
    }
}