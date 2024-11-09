import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { Player } from '../entities/Player';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { DraftBoardResponse } from '../entities/DraftBoard';
import { Between } from 'typeorm';

@Service()
export class DraftBoardService {
    private playerRepository: Repository<Player>;
    private readonly CACHE_PREFIX = 'draft_board';
    private readonly CACHE_TTL = 300; // 5 minutes in seconds

    constructor(
        private redisService: RedisService
    ) {
        this.playerRepository = AppDataSource.getRepository(Player);
    }

    private getCacheKey(roundNumber: number): string {
        return `${this.CACHE_PREFIX}:round:${roundNumber}`;
    }

    async getDraftBoard(roundNumber: number): Promise<DraftBoardResponse> {
        const cacheKey = this.getCacheKey(roundNumber);
        
        // Try to get from cache
        const cachedData = await this.redisService.get<DraftBoardResponse>(cacheKey);
        
        if (cachedData) {
            console.log(`Returning draft board for round ${roundNumber} from cache`);
            return cachedData;
        }

        console.log(`Fetching draft board for round ${roundNumber} from database`);
        
        const picksPerRound = 32;
        const startPick = (roundNumber - 1) * picksPerRound + 1;
        const endPick = roundNumber * picksPerRound;

        const players = await this.playerRepository.find({
            relations: {
                ratings: {
                    position: true,
                },
                draftData: true,
                analysis: true
            },
            where: {
                draftData: {
                    overall_pick: Between(startPick, endPick)
                }
            },
            order: {
                draftData: {
                    overall_pick: 'ASC'
                }
            }
        });

        const picks = players
            .filter(player => player.draftData)
            .map(player => ({
                overall_pick: player.draftData!.overall_pick,
                round_pick: player.draftData!.round_pick,
                player
            }));

        const response: DraftBoardResponse = {
            round: roundNumber,
            picks
        };

        // Cache the result
        await this.redisService.set(cacheKey, response, this.CACHE_TTL);

        return response;
    }

    async clearCache(roundNumber?: number): Promise<void> {
        if (roundNumber) {
            // Clear specific round
            await this.redisService.del(this.getCacheKey(roundNumber));
        } else {
            // Clear all draft board cache
            await this.redisService.delByPattern(`${this.CACHE_PREFIX}:round:*`);
        }
    }

    async refreshDraftBoard(roundNumber: number): Promise<DraftBoardResponse> {
        // Clear the cache for this round
        await this.clearCache(roundNumber);
        
        // Fetch fresh data
        return this.getDraftBoard(roundNumber);
    }

    async isDraftBoardCached(roundNumber: number): Promise<boolean> {
        return this.redisService.exists(this.getCacheKey(roundNumber));
    }
}