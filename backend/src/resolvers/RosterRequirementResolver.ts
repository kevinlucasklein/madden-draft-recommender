import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { RosterRequirement } from '../entities/RosterRequirement';
import { RosterRequirementService } from '../services/RosterRequirementService';
import { CreateRosterRequirementInput, UpdateRosterRequirementInput } from '../inputs/RosterRequirementInput';

@Service()
@Resolver(of => RosterRequirement)
export class RosterRequirementResolver {
    constructor(
        private requirementService: RosterRequirementService
    ) {}

    @Query(() => [RosterRequirement])
    async rosterRequirements() {
        return this.requirementService.findAll();
    }

    @Query(() => RosterRequirement, { nullable: true })
    async rosterRequirement(@Arg('id', () => Int) id: number) {
        return this.requirementService.findOne(id);
    }

    @Query(() => [RosterRequirement])
    async rosterRequirementsByGroup(@Arg('group') group: string) {
        return this.requirementService.findByPositionGroup(group);
    }

    @Query(() => Boolean)
    async validateRoster(@Arg('positions', () => [String]) positions: string[]) {
        return this.requirementService.validateRosterRequirements(positions);
    }

    @Mutation(() => RosterRequirement)
    async createRosterRequirement(@Arg('input') input: CreateRosterRequirementInput) {
        return this.requirementService.create(input);
    }

    @Mutation(() => RosterRequirement)
    async updateRosterRequirement(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdateRosterRequirementInput
    ) {
        return this.requirementService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deleteRosterRequirement(@Arg('id', () => Int) id: number) {
        return this.requirementService.delete(id);
    }
}