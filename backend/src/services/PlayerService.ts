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

    async findAll(): Promise<Player[]> {
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
            .orderBy('player.id', 'ASC')
            .addOrderBy('ratings.id', 'DESC')
            .getMany();

        await this.redisService.set(cacheKey, players);
        return players;
    }

    async getLatestRating(playerId: number, relation: string) {
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
    }

    async findOne(id?: number): Promise<Player | null> {
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
                analysis: true
            },
            order: { id: 'ASC' }
        });

        if (player) {
            await this.redisService.set(cacheKey, player);
        }
        return player;
    }

    async create(input: CreatePlayerInput): Promise<Player> {
        const player = this.playerRepository.create(input);
        const saved = await this.playerRepository.save(player);
        await this.redisService.clearCache();
        return saved;
    }

    async update(id: number, input: UpdatePlayerInput): Promise<Player> {
        const player = await this.playerRepository.findOneOrFail({ where: { id } });
        Object.assign(player, input);
        const updated = await this.playerRepository.save(player);
        await this.redisService.clearCache();
        return updated;
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.playerRepository.delete(id);
        await this.redisService.clearCache();
        return !!result.affected;
    }
}