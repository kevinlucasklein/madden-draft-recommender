import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerRating } from '../entities/PlayerRating';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerRatingInput, UpdatePlayerRatingInput } from '../inputs/PlayerRatingInput';

@Service()
export class PlayerRatingService {
    private ratingRepository: Repository<PlayerRating>;
    private redisService: RedisService;

    constructor() {
        this.ratingRepository = AppDataSource.getRepository(PlayerRating);
        this.redisService = RedisService.getInstance();
    }

    private async clearRatingCache(id?: number, playerId?: number) {
        if (id) {
            await this.redisService.del(`rating:${id}`);
        }
        if (playerId) {
            await this.redisService.delByPattern(`ratings:player:${playerId}:*`);
        }
        await this.redisService.del('ratings:all');
    }

    async findAll(): Promise<PlayerRating[]> {
        try {
            const cacheKey = 'ratings:all';
            const cached = await this.redisService.get<PlayerRating[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached player ratings');
                return cached;
            }

            console.log('Fetching player ratings from database');
            const ratings = await this.ratingRepository.find({
                relations: {
                    player: true,
                    team: true,
                    position: true,
                    archetype: true
                },
                order: {
                    id: 'DESC'
                }
            });

            await this.redisService.set(cacheKey, ratings);
            return ratings;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<PlayerRating | null> {
        try {
            const cacheKey = `rating:${id}`;
            const cached = await this.redisService.get<PlayerRating>(cacheKey);

            if (cached) return cached;

            const rating = await this.ratingRepository.findOne({
                where: { id },
                relations: {
                    player: true,
                    team: true,
                    position: true,
                    archetype: true
                }
            });

            if (rating) {
                await this.redisService.set(cacheKey, rating);
            }
            return rating;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findLatestByPlayer(playerId: number): Promise<PlayerRating | null> {
        try {
            const cacheKey = `ratings:player:${playerId}:latest`;
            const cached = await this.redisService.get<PlayerRating>(cacheKey);

            if (cached) return cached;

            const rating = await this.ratingRepository.findOne({
                where: {
                    player: { id: playerId }
                },
                relations: {
                    player: true,
                    team: true,
                    position: true,
                    archetype: true
                },
                order: {
                    id: 'DESC'
                }
            });

            if (rating) {
                await this.redisService.set(cacheKey, rating);
            }
            return rating;
        } catch (error) {
            console.error(`Error in findLatestByPlayer for playerId ${playerId}:`, error);
            return null;
        }
    }

    async findAllByPlayer(playerId: number): Promise<PlayerRating[]> {
        try {
            const cacheKey = `ratings:player:${playerId}:all`;
            const cached = await this.redisService.get<PlayerRating[]>(cacheKey);

            if (cached) return cached;

            const ratings = await this.ratingRepository.find({
                where: {
                    player: { id: playerId }
                },
                relations: {
                    player: true,
                    team: true,
                    position: true,
                    archetype: true
                },
                order: {
                    id: 'DESC'
                }
            });

            await this.redisService.set(cacheKey, ratings);
            return ratings;
        } catch (error) {
            console.error(`Error in findAllByPlayer for playerId ${playerId}:`, error);
            throw error;
        }
    }

    async create(input: CreatePlayerRatingInput): Promise<PlayerRating> {
        try {
            const rating = this.ratingRepository.create({
                player: { id: input.playerId },
                team: input.teamId ? { id: input.teamId } : undefined,
                position: input.positionId ? { id: input.positionId } : undefined,
                archetype: input.archetypeId ? { id: input.archetypeId } : undefined,
                overallRating: input.overallRating,
                iterationLabel: input.iterationLabel
            });

            const saved = await this.ratingRepository.save(rating);
            await this.clearRatingCache(undefined, input.playerId);
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdatePlayerRatingInput): Promise<PlayerRating> {
        try {
            const rating = await this.ratingRepository.findOneOrFail({
                where: { id },
                relations: {
                    player: true,
                    team: true,
                    position: true,
                    archetype: true
                }
            });

            if (input.overallRating !== undefined) {
                rating.overallRating = input.overallRating;
            }
            if (input.iterationLabel) {
                rating.iterationLabel = input.iterationLabel;
            }
            if (input.teamId !== undefined) {
                rating.team = input.teamId ? { id: input.teamId } as any : undefined;
            }
            if (input.positionId !== undefined) {
                rating.position = input.positionId ? { id: input.positionId } as any : undefined;
            }
            if (input.archetypeId !== undefined) {
                rating.archetype = input.archetypeId ? { id: input.archetypeId } as any : undefined;
            }

            const updated = await this.ratingRepository.save(rating);
            await this.clearRatingCache(id, rating.player.id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const rating = await this.ratingRepository.findOne({
                where: { id },
                relations: ['player']
            });
            
            if (rating) {
                const result = await this.ratingRepository.delete(id);
                await this.clearRatingCache(id, rating.player.id);
                return !!result.affected;
            }
            return false;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            return false;
        }
    }
}