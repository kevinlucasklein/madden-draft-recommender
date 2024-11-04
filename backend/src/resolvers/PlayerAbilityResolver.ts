import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { PlayerAbility } from '../entities/PlayerAbility';
import { PlayerAbilityService } from '../services/PlayerAbilityService';
import { CreatePlayerAbilityInput, UpdatePlayerAbilityInput } from '../inputs/PlayerAbilityInput';

@Service()
@Resolver(of => PlayerAbility)
export class PlayerAbilityResolver {
    constructor(
        private abilityService: PlayerAbilityService
    ) {}

    @Query(() => [PlayerAbility])
    async playerAbilities() {
        return this.abilityService.findAll();
    }

    @Query(() => PlayerAbility, { nullable: true })
    async playerAbility(@Arg('id', () => Int) id: number) {
        return this.abilityService.findOne(id);
    }

    @Query(() => [PlayerAbility])
    async playerAbilitiesByPlayer(@Arg('playerId', () => Int) playerId: number) {
        return this.abilityService.findByPlayer(playerId);
    }

    @Mutation(() => PlayerAbility)
    async createPlayerAbility(@Arg('input') input: CreatePlayerAbilityInput) {
        return this.abilityService.create(input);
    }

    @Mutation(() => PlayerAbility)
    async updatePlayerAbility(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdatePlayerAbilityInput
    ) {
        return this.abilityService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deletePlayerAbility(@Arg('id', () => Int) id: number) {
        return this.abilityService.delete(id);
    }

    @Mutation(() => [PlayerAbility])
    async reorderPlayerAbilities(
        @Arg('playerId', () => Int) playerId: number,
        @Arg('abilityIds', () => [Int]) abilityIds: number[]
    ) {
        return this.abilityService.reorderAbilities(playerId, abilityIds);
    }
}