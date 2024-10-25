import { Resolver, Query, Arg, Int } from 'type-graphql';
import { Player } from '../entities/Player';
import { AppDataSource } from '../config/database';
import { MoreThan } from 'typeorm';

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
            take: 10
        });
    }

    @Query(() => Player, { nullable: true })
    async player(
        @Arg('id', () => Int, { nullable: true }) id?: number
    ) {
        const playerRepository = AppDataSource.getRepository(Player);

        try {
            if (id) {
                // If ID is provided, find that specific player
                return await playerRepository.findOne({
                    where: { id },
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
            } else {
                // If no ID provided, get the first player by ID
                return await playerRepository.findOne({
                    where: { id: MoreThan(0) },  // This ensures we get the first player
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
                    order: {
                        id: 'ASC'
                    }
                });
            }
        } catch (error) {
            console.error('Error finding player:', error);
            return null;
        }
    }
}