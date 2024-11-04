import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { DraftSession } from '../entities/DraftSession';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreateDraftSessionInput, UpdateDraftSessionInput } from '../inputs/DraftSessionInput';

@Service()
export class DraftSessionService {
    private sessionRepository: Repository<DraftSession>;
    private redisService: RedisService;

    constructor() {
        this.sessionRepository = AppDataSource.getRepository(DraftSession);
        this.redisService = RedisService.getInstance();
    }

    private async clearSessionCache(id?: number) {
        if (id) {
            await this.redisService.del(`session:${id}`);
        }
        await this.redisService.del('sessions:all');
        await this.redisService.del('session:active');
    }

    async findAll(): Promise<DraftSession[]> {
        try {
            const cacheKey = 'sessions:all';
            const cached = await this.redisService.get<DraftSession[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached draft sessions');
                return cached;
            }

            console.log('Fetching draft sessions from database');
            const sessions = await this.sessionRepository.find({
                relations: {
                    picks: true,
                    recommendations: true
                },
                order: {
                    createdAt: 'DESC'
                }
            });

            await this.redisService.set(cacheKey, sessions);
            return sessions;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<DraftSession | null> {
        try {
            const cacheKey = `session:${id}`;
            const cached = await this.redisService.get<DraftSession>(cacheKey);

            if (cached) return cached;

            const session = await this.sessionRepository.findOne({
                where: { id },
                relations: {
                    picks: true,
                    recommendations: true
                }
            });

            if (session) {
                await this.redisService.set(cacheKey, session);
            }
            return session;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findActive(): Promise<DraftSession | null> {
        try {
            const cacheKey = 'session:active';
            const cached = await this.redisService.get<DraftSession>(cacheKey);

            if (cached) return cached;

            const session = await this.sessionRepository.findOne({
                where: { status: 'ACTIVE' },
                relations: {
                    picks: true,
                    recommendations: true
                },
                order: { createdAt: 'DESC' }
            });

            if (session) {
                await this.redisService.set(cacheKey, session);
            }
            return session;
        } catch (error) {
            console.error('Error in findActive:', error);
            return null;
        }
    }

    async create(input: CreateDraftSessionInput): Promise<DraftSession> {
        try {
            // If creating a new active session, deactivate any existing active sessions
            if (input.status === 'ACTIVE') {
                await this.deactivateAllSessions();
            }

            const session = this.sessionRepository.create({
                draftPosition: input.draftPosition,
                status: input.status || 'ACTIVE',
                rosterNeeds: input.rosterNeeds,
                createdAt: new Date()
            });

            const saved = await this.sessionRepository.save(session);
            await this.clearSessionCache();
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdateDraftSessionInput): Promise<DraftSession> {
        try {
            const session = await this.sessionRepository.findOneOrFail({
                where: { id },
                relations: {
                    picks: true,
                    recommendations: true
                }
            });

            // If updating to active status, deactivate other sessions
            if (input.status === 'ACTIVE' && session.status !== 'ACTIVE') {
                await this.deactivateAllSessions();
            }

            if (input.status) {
                session.status = input.status;
            }

            if (input.rosterNeeds) {
                session.rosterNeeds = input.rosterNeeds;
            }

            const updated = await this.sessionRepository.save(session);
            await this.clearSessionCache(id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const result = await this.sessionRepository.delete(id);
            await this.clearSessionCache(id);
            return !!result.affected;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            return false;
        }
    }

    private async deactivateAllSessions(): Promise<void> {
        try {
            await this.sessionRepository
                .createQueryBuilder()
                .update(DraftSession)
                .set({ status: 'INACTIVE' })
                .where("status = :status", { status: 'ACTIVE' })
                .execute();
            
            await this.clearSessionCache();
        } catch (error) {
            console.error('Error in deactivateAllSessions:', error);
            throw error;
        }
    }

    async validateRosterNeeds(rosterNeeds: string): Promise<boolean> {
        try {
            const needs = JSON.parse(rosterNeeds);
            return typeof needs === 'object' && !Array.isArray(needs);
        } catch {
            return false;
        }
    }
}