import { Service } from 'typedi';
import { Repository, In } from 'typeorm';
import { PlayerAbility } from '../entities/PlayerAbility';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerAbilityInput, UpdatePlayerAbilityInput } from '../inputs/PlayerAbilityInput';

@Service()
export class PlayerAbilityService {
    private abilityRepository: Repository<PlayerAbility>;
    private redisService: RedisService;

    constructor() {
        this.abilityRepository = AppDataSource.getRepository(PlayerAbility);
        this.redisService = RedisService.getInstance();
    }

    private async clearAbilityCache(id?: number, playerId?: number) {
        if (id) {
            await this.redisService.del(`ability:${id}`);
        }
        if (playerId) {
            await this.redisService.del(`abilities:player:${playerId}`);
        }
        await this.redisService.del('abilities:all');
    }

    async findAll(): Promise<PlayerAbility[]> {
        try {
            const cacheKey = 'abilities:all';
            const cached = await this.redisService.get<PlayerAbility[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached player abilities');
                return cached;
            }

            console.log('Fetching player abilities from database');
            const abilities = await this.abilityRepository.find({
                relations: {
                    player: true,
                    rating: true
                },
                order: {
                    abilityOrder: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, abilities);
            return abilities;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<PlayerAbility | null> {
        try {
            const cacheKey = `ability:${id}`;
            const cached = await this.redisService.get<PlayerAbility>(cacheKey);

            if (cached) return cached;

            const ability = await this.abilityRepository.findOne({
                where: { id },
                relations: {
                    player: true,
                    rating: true
                }
            });

            if (ability) {
                await this.redisService.set(cacheKey, ability);
            }
            return ability;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findByPlayer(playerId: number): Promise<PlayerAbility[]> {
        try {
            const cacheKey = `abilities:player:${playerId}`;
            const cached = await this.redisService.get<PlayerAbility[]>(cacheKey);

            if (cached) return cached;

            const abilities = await this.abilityRepository.find({
                where: {
                    player: { id: playerId }
                },
                relations: {
                    player: true,
                    rating: true
                },
                order: {
                    abilityOrder: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, abilities);
            return abilities;
        } catch (error) {
            console.error(`Error in findByPlayer for playerId ${playerId}:`, error);
            throw error;
        }
    }

    async create(input: CreatePlayerAbilityInput): Promise<PlayerAbility> {
        try {
            const ability = this.abilityRepository.create({
                player: { id: input.playerId },
                rating: input.ratingId ? { id: input.ratingId } : undefined,
                abilityLabel: input.abilityLabel,
                abilityOrder: input.abilityOrder
            });

            const saved = await this.abilityRepository.save(ability);
            await this.clearAbilityCache(undefined, input.playerId);
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdatePlayerAbilityInput): Promise<PlayerAbility> {
        try {
            const ability = await this.abilityRepository.findOneOrFail({
                where: { id },
                relations: {
                    player: true,
                    rating: true
                }
            });

            if (input.abilityLabel) {
                ability.abilityLabel = input.abilityLabel;
            }
            if (input.abilityOrder !== undefined) {
                ability.abilityOrder = input.abilityOrder;
            }
            if (input.ratingId !== undefined) {
                ability.rating = input.ratingId ? { id: input.ratingId } as any : undefined;
            }

            const updated = await this.abilityRepository.save(ability);
            await this.clearAbilityCache(id, ability.player.id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const ability = await this.abilityRepository.findOne({
                where: { id },
                relations: ['player']
            });
            
            if (ability) {
                const result = await this.abilityRepository.delete(id);
                await this.clearAbilityCache(id, ability.player.id);
                return !!result.affected;
            }
            return false;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            throw error;
        }
    }

    async reorderAbilities(playerId: number, abilityIds: number[]): Promise<PlayerAbility[]> {
        try {
            const abilities = await this.abilityRepository.find({
                where: {
                    player: { id: playerId },
                    id: In(abilityIds)
                }
            });

            const updates = abilities.map((ability, index) => {
                ability.abilityOrder = index + 1;
                return ability;
            });

            const saved = await this.abilityRepository.save(updates);
            await this.clearAbilityCache(undefined, playerId);
            return saved;
        } catch (error) {
            console.error(`Error in reorderAbilities for playerId ${playerId}:`, error);
            throw error;
        }
    }
}