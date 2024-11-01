import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { DraftPick } from '../entities/DraftPick';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreateDraftPickInput, UpdateDraftPickInput } from '../inputs/DraftPickInput';

@Service()
export class DraftPickService {
    private draftPickRepository: Repository<DraftPick>;
    private redisService: RedisService;

    constructor() {
        this.draftPickRepository = AppDataSource.getRepository(DraftPick);
        this.redisService = RedisService.getInstance();
    }

    private async clearDraftPickCache(id?: number, sessionId?: number) {
        if (id) {
            await this.redisService.del(`draftPick:${id}`);
        }
        if (sessionId) {
            await this.redisService.del(`draftPicks:session:${sessionId}`);
        }
        await this.redisService.del('draftPicks:all');
    }

    async findAll(): Promise<DraftPick[]> {
        try {
            const cacheKey = 'draftPicks:all';
            const cached = await this.redisService.get<DraftPick[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached draft picks');
                return cached;
            }

            console.log('Fetching draft picks from database');
            const picks = await this.draftPickRepository.find({
                relations: {
                    session: true,
                    player: true
                },
                order: {
                    roundNumber: 'ASC',
                    pickNumber: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, picks);
            return picks;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<DraftPick | null> {
        try {
            const cacheKey = `draftPick:${id}`;
            const cached = await this.redisService.get<DraftPick>(cacheKey);

            if (cached) return cached;

            const pick = await this.draftPickRepository.findOne({
                where: { id },
                relations: {
                    session: true,
                    player: true
                }
            });

            if (pick) {
                await this.redisService.set(cacheKey, pick);
            }
            return pick;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findBySession(sessionId: number): Promise<DraftPick[]> {
        try {
            const cacheKey = `draftPicks:session:${sessionId}`;
            const cached = await this.redisService.get<DraftPick[]>(cacheKey);

            if (cached) return cached;

            const picks = await this.draftPickRepository.find({
                where: {
                    session: { id: sessionId }
                },
                relations: {
                    session: true,
                    player: true
                },
                order: {
                    roundNumber: 'ASC',
                    pickNumber: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, picks);
            return picks;
        } catch (error) {
            console.error(`Error in findBySession for sessionId ${sessionId}:`, error);
            throw error;
        }
    }

    async create(input: CreateDraftPickInput): Promise<DraftPick> {
        try {
            const pick = this.draftPickRepository.create({
                session: { id: input.sessionId },
                player: { id: input.playerId },
                roundNumber: input.roundNumber,
                pickNumber: input.pickNumber,
                draftedPosition: input.draftedPosition,
                pickedAt: new Date()
            });

            const saved = await this.draftPickRepository.save(pick);
            await this.clearDraftPickCache(undefined, input.sessionId);
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdateDraftPickInput): Promise<DraftPick> {
        try {
            const pick = await this.draftPickRepository.findOneOrFail({
                where: { id },
                relations: {
                    session: true,
                    player: true
                }
            });

            if (input.playerId) {
                pick.player = { id: input.playerId } as any;
            }
            if (input.roundNumber !== undefined) {
                pick.roundNumber = input.roundNumber;
            }
            if (input.pickNumber !== undefined) {
                pick.pickNumber = input.pickNumber;
            }
            if (input.draftedPosition) {
                pick.draftedPosition = input.draftedPosition;
            }

            const updated = await this.draftPickRepository.save(pick);
            await this.clearDraftPickCache(id, pick.session.id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const pick = await this.draftPickRepository.findOne({
                where: { id },
                relations: ['session']
            });
            
            if (pick) {
                const result = await this.draftPickRepository.delete(id);
                await this.clearDraftPickCache(id, pick.session.id);
                return !!result.affected;
            }
            return false;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            throw error;
        }
    }
}