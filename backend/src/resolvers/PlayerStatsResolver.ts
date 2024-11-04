import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { PlayerStats } from '../entities/PlayerStats';
import { PlayerStatsService } from '../services/PlayerStatsService';
import { CreatePlayerStatsInput, UpdatePlayerStatsInput } from '../inputs/PlayerStatsInput';

@Service()
@Resolver(of => PlayerStats)
export class PlayerStatsResolver {
    constructor(
        private statsService: PlayerStatsService
    ) {}

    @Query(() => [PlayerStats])
    async playerStats() {
        return this.statsService.findAll();
    }

    @Query(() => PlayerStats, { nullable: true })
    async playerStat(@Arg('id', () => Int) id: number) {
        return this.statsService.findOne(id);
    }

    @Query(() => PlayerStats, { nullable: true })
    async playerStatsByPlayer(@Arg('playerId', () => Int) playerId: number) {
        return this.statsService.findByPlayer(playerId);
    }

    @Mutation(() => PlayerStats)
    async createPlayerStats(@Arg('input') input: CreatePlayerStatsInput) {
        return this.statsService.create(input);
    }

    @Mutation(() => PlayerStats)
    async updatePlayerStats(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdatePlayerStatsInput
    ) {
        return this.statsService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deletePlayerStats(@Arg('id', () => Int) id: number) {
        return this.statsService.delete(id);
    }
}