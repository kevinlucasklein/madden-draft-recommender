import { Resolver, Query } from 'type-graphql';
import { PlayerStats } from '../entities/PlayerStats';
import { AppDataSource } from '../config/database';
import { Service } from 'typedi';

@Service()
@Resolver(of => PlayerStats)
export class PlayerStatsResolver {
    @Query(() => [PlayerStats])
    async playerStats() {
        const playerStatsRepository = AppDataSource.getRepository(PlayerStats);
        return await playerStatsRepository.find({
            relations: {
                player: true,
                rating: true
            }
        });
    }
}