import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { DraftData } from '../entities/DraftData';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreateDraftDataInput, UpdateDraftDataInput } from '../inputs/DraftDataInput'

@Service()
export class DraftDataService {
    private draftDataRepository: Repository<DraftData>;
    private redisService: RedisService;

    constructor() {
        this.draftDataRepository = AppDataSource.getRepository(DraftData);
        this.redisService = RedisService.getInstance();
    }

    async findAll(): Promise<DraftData[]> {
        const cacheKey = 'draftData:all';
        const cached = await this.redisService.get<DraftData[]>(cacheKey);
        
        if (cached) {
            console.log('Returning cached draft data');
            return cached;
        }

        console.log('Fetching draft data from database');
        const draftData = await this.draftDataRepository.find({
            relations: ['player'],
            order: { overall_pick: 'ASC' }
        });

        await this.redisService.set(cacheKey, draftData);
        return draftData;
    }

    async findOneById(player_id: number): Promise<DraftData | null> {
        const cacheKey = `draftData:player:${player_id}`;
        const cached = await this.redisService.get<DraftData>(cacheKey);

        if (cached) return cached;

        const draftData = await this.draftDataRepository.findOne({
            where: { player_id },
            relations: ['player']
        });

        if (draftData) {
            await this.redisService.set(cacheKey, draftData);
        }
        return draftData;
    }

    async create(input: CreateDraftDataInput): Promise<DraftData> {
        // Check if draft data already exists for this player
        const existing = await this.draftDataRepository.findOne({
            where: { player_id: input.player_id }
        });

        if (existing) {
            throw new Error('Draft data already exists for this player');
        }

        const draftData = this.draftDataRepository.create(input);
        const saved = await this.draftDataRepository.save(draftData);
        await this.redisService.clearCache();
        return saved;
    }

    async update(player_id: number, input: UpdateDraftDataInput): Promise<DraftData> {
        const draftData = await this.draftDataRepository.findOneOrFail({
            where: { player_id }
        });
        
        Object.assign(draftData, input);
        const updated = await this.draftDataRepository.save(draftData);
        await this.redisService.clearCache();
        return updated;
    }

    async delete(player_id: number): Promise<boolean> {
        const result = await this.draftDataRepository.delete(player_id);
        await this.redisService.clearCache();
        return !!result.affected;
    }
}