import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { RosterRequirement } from '../entities/RosterRequirement';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreateRosterRequirementInput, UpdateRosterRequirementInput } from '../inputs/RosterRequirementInput';

@Service()
export class RosterRequirementService {
    private requirementRepository: Repository<RosterRequirement>;
    private redisService: RedisService;

    constructor() {
        this.requirementRepository = AppDataSource.getRepository(RosterRequirement);
        this.redisService = RedisService.getInstance();
    }

    private async clearRequirementCache(id?: number) {
        if (id) {
            await this.redisService.del(`requirement:${id}`);
        }
        await this.redisService.del('requirements:all');
        await this.redisService.delByPattern('requirements:group:*');
    }

    async findAll(): Promise<RosterRequirement[]> {
        try {
            const cacheKey = 'requirements:all';
            const cached = await this.redisService.get<RosterRequirement[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached roster requirements');
                return cached;
            }

            console.log('Fetching roster requirements from database');
            const requirements = await this.requirementRepository.find({
                order: {
                    positionGroup: 'ASC',
                    position: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, requirements);
            return requirements;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<RosterRequirement | null> {
        try {
            const cacheKey = `requirement:${id}`;
            const cached = await this.redisService.get<RosterRequirement>(cacheKey);

            if (cached) return cached;

            const requirement = await this.requirementRepository.findOne({
                where: { id }
            });

            if (requirement) {
                await this.redisService.set(cacheKey, requirement);
            }
            return requirement;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findByPositionGroup(group: string): Promise<RosterRequirement[]> {
        try {
            const cacheKey = `requirements:group:${group}`;
            const cached = await this.redisService.get<RosterRequirement[]>(cacheKey);

            if (cached) return cached;

            const requirements = await this.requirementRepository.find({
                where: { positionGroup: group },
                order: {
                    position: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, requirements);
            return requirements;
        } catch (error) {
            console.error(`Error in findByPositionGroup for group ${group}:`, error);
            throw error;
        }
    }

    async create(input: CreateRosterRequirementInput): Promise<RosterRequirement> {
        try {
            const requirement = this.requirementRepository.create(input);
            const saved = await this.requirementRepository.save(requirement);
            await this.clearRequirementCache();
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdateRosterRequirementInput): Promise<RosterRequirement> {
        try {
            const requirement = await this.requirementRepository.findOneOrFail({
                where: { id }
            });

            Object.assign(requirement, input);

            const updated = await this.requirementRepository.save(requirement);
            await this.clearRequirementCache(id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const result = await this.requirementRepository.delete(id);
            await this.clearRequirementCache(id);
            return !!result.affected;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            return false;
        }
    }

    async validateRosterRequirements(positions: string[]): Promise<boolean> {
        try {
            const requirements = await this.findAll();
            const positionCounts = positions.reduce((acc, pos) => {
                acc[pos] = (acc[pos] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return requirements.every(req => {
                const count = positionCounts[req.position] || 0;
                return count >= req.minimumPlayers && count <= req.maximumPlayers;
            });
        } catch (error) {
            console.error('Error in validateRosterRequirements:', error);
            throw error;
        }
    }
}