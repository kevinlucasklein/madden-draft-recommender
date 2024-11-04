import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { Team } from '../entities/Team';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreateTeamInput, UpdateTeamInput } from '../inputs/TeamInput';

@Service()
export class TeamService {
    private teamRepository: Repository<Team>;
    private redisService: RedisService;

    constructor() {
        this.teamRepository = AppDataSource.getRepository(Team);
        this.redisService = RedisService.getInstance();
    }

    private async clearTeamCache(id?: number) {
        if (id) {
            await this.redisService.del(`team:${id}`);
        }
        await this.redisService.del('teams:all');
    }

    async findAll(): Promise<Team[]> {
        try {
            const cacheKey = 'teams:all';
            const cached = await this.redisService.get<Team[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached teams');
                return cached;
            }

            console.log('Fetching teams from database');
            const teams = await this.teamRepository.find({
                order: {
                    name: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, teams);
            return teams;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<Team | null> {
        try {
            const cacheKey = `team:${id}`;
            const cached = await this.redisService.get<Team>(cacheKey);

            if (cached) return cached;

            const team = await this.teamRepository.findOne({
                where: { id }
            });

            if (team) {
                await this.redisService.set(cacheKey, team);
            }
            return team;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findByName(name: string): Promise<Team | null> {
        try {
            const teams = await this.findAll();
            return teams.find(team => 
                team.name.toLowerCase() === name.toLowerCase()
            ) || null;
        } catch (error) {
            console.error(`Error in findByName for name ${name}:`, error);
            return null;
        }
    }

    async create(input: CreateTeamInput): Promise<Team> {
        try {
            const team = this.teamRepository.create(input);
            const saved = await this.teamRepository.save(team);
            await this.clearTeamCache();
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdateTeamInput): Promise<Team> {
        try {
            const team = await this.teamRepository.findOneOrFail({
                where: { id }
            });

            Object.assign(team, input);

            const updated = await this.teamRepository.save(team);
            await this.clearTeamCache(id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const result = await this.teamRepository.delete(id);
            await this.clearTeamCache(id);
            return !!result.affected;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            return false;
        }
    }
}