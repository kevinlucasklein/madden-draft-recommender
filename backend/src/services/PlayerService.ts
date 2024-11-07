import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { Player } from '../entities/Player';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerInput, UpdatePlayerInput } from '../inputs/PlayerInput';
import { PlayerStatsService } from './PlayerStatsService';
import { PlayerStats } from '../entities/PlayerStats';

import { MoreThan } from 'typeorm';

interface CachedPlayerStats extends Omit<PlayerStats, 'player'> {
    player_id: number;
}

interface CachedPlayer extends Omit<Player, 'stats'> {
    stats?: CachedPlayerStats[];
}

@Service()
export class PlayerService {
    private playerRepository: Repository<Player>;
    private redisService: RedisService;

    constructor(
        private statsService: PlayerStatsService
    ) {
        this.playerRepository = AppDataSource.getRepository(Player);
        this.redisService = RedisService.getInstance();
    }

    private async clearPlayerCache(playerId?: number) {
        if (playerId) {
            await this.redisService.delByPattern(`player:${playerId}:*`);
            await this.redisService.del(`player:${playerId}`);
        }
        await this.redisService.del('players:all');
    }

    private transformPlayerForCache(player: Player): CachedPlayer {
        const { stats, ...playerBase } = player;
        return {
            ...playerBase,
            stats: stats?.map(stat => {
                const { player, ...statWithoutPlayer } = stat;
                return {
                    ...statWithoutPlayer,
                    player_id: player.id
                };
            })
        };
    }

    async findAll(): Promise<Player[]> {
        try {
            const cacheKey = 'players:all';
            const cached = await this.redisService.get<CachedPlayer[]>(cacheKey);
            
            if (cached) {
                // Transform cached data back to Player type
                return cached.map(cachedPlayer => ({
                    ...cachedPlayer,
                    stats: cachedPlayer.stats?.map(stat => ({
                        ...stat,
                        player: { id: stat.player_id } as Player
                    }))
                })) as Player[];
            }

            console.log('Fetching players from database');
            
            // Fetch players and stats in parallel for better performance
            const [players, allStats] = await Promise.all([
                this.playerRepository
                    .createQueryBuilder('player')
                    .leftJoinAndSelect('player.abilities', 'abilities')
                    .leftJoinAndSelect('player.ratings', 'ratings')
                    .leftJoinAndSelect('ratings.position', 'position')
                    .leftJoinAndSelect('ratings.team', 'team')
                    .leftJoinAndSelect('ratings.archetype', 'archetype')
                    .leftJoinAndSelect('player.draftData', 'draftData')
                    .orderBy('player.id', 'ASC')
                    .addOrderBy('ratings.id', 'DESC')
                    .getMany(),
                
                this.statsService.findAllLatestStats()
            ]);

            const statsMap = new Map(allStats.map(stats => [stats.player_id, stats]));

            // Combine the data in memory
            const playersWithStats = players.map(player => {
                const playerStats = statsMap.get(player.id);
                if (playerStats) {
                    player.stats = [{
                        id: playerStats.stat_id,
                        // Create a proper Player reference
                        player: { id: player.id } as Player,  // Cast as Player type
                        speed: playerStats.speed,
                        acceleration: playerStats.acceleration,
                        agility: playerStats.agility,
                        jumping: playerStats.jumping,
                        stamina: playerStats.stamina,
                        strength: playerStats.strength,
                        awareness: playerStats.awareness,
                        bcvision: playerStats.bcvision,
                        blockShedding: playerStats.block_shedding,
                        breakSack: playerStats.break_sack,
                        breakTackle: playerStats.break_tackle,
                        carrying: playerStats.carrying,
                        catchInTraffic: playerStats.catch_in_traffic,
                        catching: playerStats.catching,
                        changeOfDirection: playerStats.change_of_direction,
                        deepRouteRunning: playerStats.deep_route_running,
                        finesseMoves: playerStats.finesse_moves,
                        hitPower: playerStats.hit_power,
                        impactBlocking: playerStats.impact_blocking,
                        injury: playerStats.injury,
                        jukeMove: playerStats.juke_move,
                        kickAccuracy: playerStats.kick_accuracy,
                        kickPower: playerStats.kick_power,
                        kickReturn: playerStats.kick_return,
                        leadBlock: playerStats.lead_block,
                        manCoverage: playerStats.man_coverage,
                        mediumRouteRunning: playerStats.medium_route_running,
                        passBlock: playerStats.pass_block,
                        passBlockFinesse: playerStats.pass_block_finesse,
                        passBlockPower: playerStats.pass_block_power,
                        playAction: playerStats.play_action,
                        playRecognition: playerStats.play_recognition,
                        powerMoves: playerStats.power_moves,
                        press: playerStats.press,
                        pursuit: playerStats.pursuit,
                        release: playerStats.release,
                        runBlock: playerStats.run_block,
                        runBlockFinesse: playerStats.run_block_finesse,
                        runBlockPower: playerStats.run_block_power,
                        runningStyle: playerStats.running_style,
                        shortRouteRunning: playerStats.short_route_running,
                        spectacularCatch: playerStats.spectacular_catch,
                        spinMove: playerStats.spin_move,
                        stiffArm: playerStats.stiff_arm,
                        tackle: playerStats.tackle,
                        throwAccuracyDeep: playerStats.throw_accuracy_deep,
                        throwAccuracyMid: playerStats.throw_accuracy_mid,
                        throwAccuracyShort: playerStats.throw_accuracy_short,
                        throwOnTheRun: playerStats.throw_on_the_run,
                        throwPower: playerStats.throw_power,
                        throwUnderPressure: playerStats.throw_under_pressure,
                        toughness: playerStats.toughness,
                        trucking: playerStats.trucking,
                        zoneCoverage: playerStats.zone_coverage
                    }];
                }
                return player;
            });

            const transformedPlayers = playersWithStats.map(player => this.transformPlayerForCache(player));
            await this.redisService.set(cacheKey, transformedPlayers);
            
            return playersWithStats;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id?: number): Promise<Player | null> {
        try {
            const cacheKey = `player:${id || 'random'}`;
            const cached = await this.redisService.get<Player>(cacheKey);

            if (cached) return cached;

            const whereCondition = id ? { id } : { id: MoreThan(0) };
            
            const player = await this.playerRepository.findOne({
                where: whereCondition,
                relations: {
                    position: true,
                    team: true,
                    archetype: true,
                    abilities: true,
                    ratings: true,
                    stats: true,
                    analysis: true,
                    draftData: true
                },
                order: { id: 'ASC' }
            });

            if (player) {
                // Transform before caching
                const transformedPlayer = this.transformPlayerForCache(player);
                await this.redisService.set(cacheKey, transformedPlayer);
            }
            return player;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async create(input: CreatePlayerInput): Promise<Player> {
        try {
            const player = this.playerRepository.create(input);
            const saved = await this.playerRepository.save(player);
            await this.clearPlayerCache();
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdatePlayerInput): Promise<Player> {
        try {
            const player = await this.playerRepository.findOneOrFail({ where: { id } });
            Object.assign(player, input);
            const updated = await this.playerRepository.save(player);
            await this.clearPlayerCache(id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const result = await this.playerRepository.delete(id);
            await this.clearPlayerCache(id);
            return !!result.affected;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            throw error;
        }
    }
}