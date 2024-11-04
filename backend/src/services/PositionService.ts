import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { Position } from '../entities/Position';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePositionInput, UpdatePositionInput } from '../inputs/PositionInput';

@Service()
export class PositionService {
    private positionRepository: Repository<Position>;
    private redisService: RedisService;

    constructor() {
        this.positionRepository = AppDataSource.getRepository(Position);
        this.redisService = RedisService.getInstance();
    }

    private async clearPositionCache(id?: number) {
        if (id) {
            await this.redisService.del(`position:${id}`);
        }
        await this.redisService.del('positions:all');
        await this.redisService.delByPattern('positions:type:*');
    }

    async findAll(): Promise<Position[]> {
        try {
            const cacheKey = 'positions:all';
            const cached = await this.redisService.get<Position[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached positions');
                return cached;
            }

            console.log('Fetching positions from database');
            const positions = await this.positionRepository.find({
                order: {
                    type: 'ASC',
                    code: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, positions);
            return positions;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<Position | null> {
        try {
            const cacheKey = `position:${id}`;
            const cached = await this.redisService.get<Position>(cacheKey);

            if (cached) return cached;

            const position = await this.positionRepository.findOne({
                where: { id }
            });

            if (position) {
                await this.redisService.set(cacheKey, position);
            }
            return position;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findByType(type: string): Promise<Position[]> {
        try {
            const cacheKey = `positions:type:${type}`;
            const cached = await this.redisService.get<Position[]>(cacheKey);

            if (cached) return cached;

            const positions = await this.positionRepository.find({
                where: { type },
                order: {
                    code: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, positions);
            return positions;
        } catch (error) {
            console.error(`Error in findByType for type ${type}:`, error);
            throw error;
        }
    }

    async create(input: CreatePositionInput): Promise<Position> {
        try {
            const position = this.positionRepository.create(input);
            const saved = await this.positionRepository.save(position);
            await this.clearPositionCache();
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdatePositionInput): Promise<Position> {
        try {
            const position = await this.positionRepository.findOneOrFail({
                where: { id }
            });

            Object.assign(position, input);

            const updated = await this.positionRepository.save(position);
            await this.clearPositionCache(id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const result = await this.positionRepository.delete(id);
            await this.clearPositionCache(id);
            return !!result.affected;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            return false;
        }
    }
}