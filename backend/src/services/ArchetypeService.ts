import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { Archetype } from '../entities/Archetype';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreateArchetypeInput, UpdateArchetypeInput } from '../inputs/ArchetypeInput';

@Service()
export class ArchetypeService {
    private archetypeRepository: Repository<Archetype>;
    private redisService: RedisService;

    constructor() {
        this.archetypeRepository = AppDataSource.getRepository(Archetype);
        this.redisService = RedisService.getInstance();
    }

    async findAll(): Promise<Archetype[]> {
        const cacheKey = 'archetypes:all';
        const cached = await this.redisService.get<Archetype[]>(cacheKey);
        
        if (cached) {
            console.log('Returning cached archetypes data');
            return cached;
        }

        console.log('Fetching archetypes from database');
        const archetypes = await this.archetypeRepository.find({
            order: { id: 'ASC' }
        });

        await this.redisService.set(cacheKey, archetypes);
        return archetypes;
    }

    async findOne(id: number): Promise<Archetype | null> {
        const cacheKey = `archetype:${id}`;
        const cached = await this.redisService.get<Archetype>(cacheKey);

        if (cached) return cached;

        const archetype = await this.archetypeRepository.findOne({
            where: { id }
        });

        if (archetype) {
            await this.redisService.set(cacheKey, archetype);
        }
        return archetype;
    }

    async create(input: CreateArchetypeInput): Promise<Archetype> {
        const archetype = this.archetypeRepository.create(input);
        const saved = await this.archetypeRepository.save(archetype);
        await this.redisService.clearCache();
        return saved;
    }

    async update(id: number, input: UpdateArchetypeInput): Promise<Archetype> {
        const archetype = await this.archetypeRepository.findOneOrFail({ where: { id } });
        Object.assign(archetype, input);
        const updated = await this.archetypeRepository.save(archetype);
        await this.redisService.clearCache();
        return updated;
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.archetypeRepository.delete(id);
        await this.redisService.clearCache();
        return !!result.affected;
    }
}