import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerStats } from '../entities/PlayerStats';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerStatsInput, UpdatePlayerStatsInput } from '../inputs/PlayerStatsInput';

@Service()
export class PlayerStatsService {
    private statsRepository: Repository<PlayerStats>;
    private redisService: RedisService;

    constructor() {
        this.statsRepository = AppDataSource.getRepository(PlayerStats);
        this.redisService = RedisService.getInstance();
    }

    private async clearStatsCache(id?: number, playerId?: number) {
        if (id) {
            await this.redisService.del(`stats:${id}`);
        }
        if (playerId) {
            await this.redisService.del(`stats:player:${playerId}`);
        }
        await this.redisService.del('stats:all');
    }

    async findAll(): Promise<PlayerStats[]> {
        try {
            const cacheKey = 'stats:all';
            const cached = await this.redisService.get<PlayerStats[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached player stats');
                return cached;
            }

            console.log('Fetching player stats from database');
            const stats = await this.statsRepository.find({
                relations: {
                    player: true,
                    rating: true
                }
            });

            await this.redisService.set(cacheKey, stats);
            return stats;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<PlayerStats | null> {
        try {
            const cacheKey = `stats:${id}`;
            const cached = await this.redisService.get<PlayerStats>(cacheKey);

            if (cached) return cached;

            const stats = await this.statsRepository.findOne({
                where: { id },
                relations: {
                    player: true,
                    rating: true
                }
            });

            if (stats) {
                await this.redisService.set(cacheKey, stats);
            }
            return stats;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findByPlayer(playerId: number): Promise<PlayerStats | null> {
        try {
            const cacheKey = `stats:player:${playerId}`;
            const cached = await this.redisService.get<PlayerStats>(cacheKey);

            if (cached) return cached;

            const stats = await this.statsRepository.findOne({
                where: {
                    player: { id: playerId }
                },
                relations: {
                    player: true,
                    rating: true
                }
            });

            if (stats) {
                await this.redisService.set(cacheKey, stats);
            }
            return stats;
        } catch (error) {
            console.error(`Error in findByPlayer for playerId ${playerId}:`, error);
            return null;
        }
    }

    async findAllLatestStats(): Promise<any[]> {
        return this.statsRepository.query(`
            SELECT DISTINCT ON (player_id) 
                stat_id,
                player_id,
                speed,
                acceleration,
                agility,
                jumping,
                stamina,
                strength,
                awareness,
                bcvision,
                block_shedding,
                break_sack,
                break_tackle,
                carrying,
                catch_in_traffic,
                catching,
                change_of_direction,
                deep_route_running,
                finesse_moves,
                hit_power,
                impact_blocking,
                injury,
                juke_move,
                kick_accuracy,
                kick_power,
                kick_return,
                lead_block,
                man_coverage,
                medium_route_running,
                pass_block,
                pass_block_finesse,
                pass_block_power,
                play_action,
                play_recognition,
                power_moves,
                press,
                pursuit,
                release,
                run_block,
                run_block_finesse,
                run_block_power,
                running_style,
                short_route_running,
                spectacular_catch,
                spin_move,
                stiff_arm,
                tackle,
                throw_accuracy_deep,
                throw_accuracy_mid,
                throw_accuracy_short,
                throw_on_the_run,
                throw_power,
                throw_under_pressure,
                toughness,
                trucking,
                zone_coverage
            FROM player_stats
            ORDER BY player_id, stat_id DESC
        `);
    }

    async create(input: CreatePlayerStatsInput): Promise<PlayerStats> {
        try {
            const stats = this.statsRepository.create({
                player: { id: input.playerId },
                rating: input.ratingId ? { id: input.ratingId } : undefined,
                ...input
            });

            const saved = await this.statsRepository.save(stats);
            await this.clearStatsCache(undefined, input.playerId);
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdatePlayerStatsInput): Promise<PlayerStats> {
        try {
            const stats = await this.statsRepository.findOneOrFail({
                where: { id },
                relations: {
                    player: true,
                    rating: true
                }
            });

            Object.assign(stats, input);

            if (input.ratingId !== undefined) {
                stats.rating = input.ratingId ? { id: input.ratingId } as any : undefined;
            }

            const updated = await this.statsRepository.save(stats);
            await this.clearStatsCache(id, stats.player.id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const stats = await this.statsRepository.findOne({
                where: { id },
                relations: ['player']
            });
            
            if (stats) {
                const result = await this.statsRepository.delete(id);
                await this.clearStatsCache(id, stats.player.id);
                return !!result.affected;
            }
            return false;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            return false;
        }
    }
}