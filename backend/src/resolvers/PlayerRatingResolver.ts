import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { PlayerRating } from '../entities/PlayerRating';
import { PlayerRatingService } from '../services/PlayerRatingService';
import { CreatePlayerRatingInput, UpdatePlayerRatingInput } from '../inputs/PlayerRatingInput';

@Service()
@Resolver(of => PlayerRating)
export class PlayerRatingResolver {
    constructor(
        private ratingService: PlayerRatingService
    ) {}

    @Query(() => [PlayerRating])
    async playerRatings() {
        return this.ratingService.findAll();
    }

    @Query(() => PlayerRating, { nullable: true })
    async playerRating(@Arg('id', () => Int) id: number) {
        return this.ratingService.findOne(id);
    }

    @Query(() => PlayerRating, { nullable: true })
    async latestPlayerRating(@Arg('playerId', () => Int) playerId: number) {
        return this.ratingService.findLatestByPlayer(playerId);
    }

    @Query(() => [PlayerRating])
    async playerRatingsByPlayer(@Arg('playerId', () => Int) playerId: number) {
        return this.ratingService.findAllByPlayer(playerId);
    }

    @Mutation(() => PlayerRating)
    async createPlayerRating(@Arg('input') input: CreatePlayerRatingInput) {
        return this.ratingService.create(input);
    }

    @Mutation(() => PlayerRating)
    async updatePlayerRating(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdatePlayerRatingInput
    ) {
        return this.ratingService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deletePlayerRating(@Arg('id', () => Int) id: number) {
        return this.ratingService.delete(id);
    }
}