import { Resolver, Query } from 'type-graphql';
import { PlayerRating } from '../entities/PlayerRating';
import { AppDataSource } from '../config/database';

@Resolver(of => PlayerRating)
export class PlayerRatingResolver {
    @Query(() => [PlayerRating])
    async playerRatings() {
        const playerRatingRepository = AppDataSource.getRepository(PlayerRating);
        return await playerRatingRepository.find({
            relations: {
                player: true,
                team: true,
                position: true,
                archetype: true
            }
        });
    }
}