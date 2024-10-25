import { Resolver, Query } from 'type-graphql';
import { Player } from '../entities/Player';
import { AppDataSource } from '../config/database';

@Resolver(of => Player)
export class PlayerResolver {
    @Query(() => [Player])
    async players() {
        const playerRepository = AppDataSource.getRepository(Player);
        return await playerRepository.find({
            relations: {
                ratings: {
                    team: true,
                    position: true,
                    archetype: true
                },
                abilities: {
                    rating: true
                },
                stats: true,
                analysis: true
            },
            take: 10  // Limit to 10 players for testing
        });
    }

    @Query(() => Player, { nullable: true })
    async player() {
        const playerRepository = AppDataSource.getRepository(Player);
        return await playerRepository.findOne({
            where: { id: 1 },  // Get first player
            relations: {
                ratings: {
                    team: true,
                    position: true,
                    archetype: true
                },
                abilities: {
                    rating: true
                },
                stats: true,
                analysis: true
            }
        });
    }
}