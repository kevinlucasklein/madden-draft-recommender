import { Resolver, Query, Mutation, Arg, Int, FieldResolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { Player } from '../entities/Player';
import { PlayerService } from '../services/PlayerService';
import { CreatePlayerInput, UpdatePlayerInput } from '../inputs/PlayerInput';

@Service()
@Resolver(of => Player)
export class PlayerResolver {
    constructor(
        private playerService: PlayerService
    ) {}

    @Query(() => [Player])
    async players() {
        return this.playerService.findAll();
    }

    @FieldResolver()
    async position(@Root() player: Player) {
        // Use cached data if available
        if (player.ratings?.[0]?.position) {
            return player.ratings[0].position;
        }
        return this.playerService.getLatestRating(player.id, 'position');
    }

    @FieldResolver()
    async team(@Root() player: Player) {
        if (player.ratings?.[0]?.team) {
            return player.ratings[0].team;
        }
        return this.playerService.getLatestRating(player.id, 'team');
    }

    @FieldResolver()
    async archetype(@Root() player: Player) {
        if (player.ratings?.[0]?.archetype) {
            return player.ratings[0].archetype;
        }
        return this.playerService.getLatestRating(player.id, 'archetype');
    }

    @Query(() => Player, { nullable: true })
    async player(@Arg('id', () => Int, { nullable: true }) id?: number) {
        try {
            return await this.playerService.findOne(id);
        } catch (error) {
            console.error('Error finding player:', error);
            return null;
        }
    }

    @Mutation(() => Player)
    async createPlayer(@Arg('input') input: CreatePlayerInput) {
        return this.playerService.create(input);
    }

    @Mutation(() => Player)
    async updatePlayer(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdatePlayerInput
    ) {
        return this.playerService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deletePlayer(@Arg('id', () => Int) id: number) {
        return this.playerService.delete(id);
    }
}