import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { Player } from '../entities/Player';
import { PlayerRating } from '../entities/PlayerRating';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerInput, UpdatePlayerInput } from '../inputs/PlayerInput';
import { MoreThan } from 'typeorm';

@Service()
export class PlayerService {
    private playerRepository: Repository<Player>;
    private ratingRepository: Repository<PlayerRating>;
    private redisService: RedisService;

    constructor() {
        this.playerRepository = AppDataSource.getRepository(Player);
        this.ratingRepository = AppDataSource.getRepository(PlayerRating);
        this.redisService = RedisService.getInstance();
    }

    private async clearPlayerCache(playerId?: number) {
        if (playerId) {
            await this.redisService.delByPattern(`player:${playerId}:*`);
            await this.redisService.del(`player:${playerId}`);
        }
        await this.redisService.del('players:all');
    }

    async findAll(): Promise<Player[]> {
        try {
            const cacheKey = 'players:all';
            const cached = await this.redisService.get<Player[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached players data');
                return cached;
            }

            console.log('Fetching players from database');
            const players = await this.playerRepository
                .createQueryBuilder('player')
                .leftJoinAndSelect('player.ratings', 'ratings')
                .leftJoinAndSelect('ratings.position', 'position')
                .leftJoinAndSelect('ratings.team', 'team')
                .leftJoinAndSelect('ratings.archetype', 'archetype')
                .leftJoinAndSelect('player.abilities', 'abilities')
                .leftJoinAndSelect('player.stats', 'stats')
                .leftJoinAndSelect('player.draftData', 'draftData')
                .leftJoinAndSelect('player.analysis', 'analysis')
                .orderBy('player.id', 'ASC')
                .addOrderBy('ratings.id', 'DESC')
                .getMany();

            await this.redisService.set(cacheKey, players);
            return players;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async getLatestRating(playerId: number, relation: string) {
        try {
            const cacheKey = `player:${playerId}:${relation}`;
            const cached = await this.redisService.get(cacheKey);

            if (cached) {
                console.log(`Returning cached ${relation} for player ${playerId}`);
                return cached;
            }

            console.log(`Fetching ${relation} from database for player ${playerId}`);
            const rating = await this.ratingRepository.findOne({
                where: { player: { id: playerId } },
                relations: [relation],
                order: { id: 'DESC' }
            });

            const result = rating?.[relation as keyof PlayerRating];
            if (result) {
                await this.redisService.set(cacheKey, result);
            }
            return result;
        } catch (error) {
            console.error(`Error in getLatestRating for player ${playerId}:`, error);
            return null;
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
                await this.redisService.set(cacheKey, player);
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