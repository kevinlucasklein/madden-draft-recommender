import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { Team } from '../entities/Team';
import { TeamService } from '../services/TeamService';
import { CreateTeamInput, UpdateTeamInput } from '../inputs/TeamInput';

@Service()
@Resolver(of => Team)
export class TeamResolver {
    constructor(
        private teamService: TeamService
    ) {}

    @Query(() => [Team])
    async teams() {
        return this.teamService.findAll();
    }

    @Query(() => Team, { nullable: true })
    async team(@Arg('id', () => Int) id: number) {
        return this.teamService.findOne(id);
    }

    @Query(() => Team, { nullable: true })
    async teamByName(@Arg('name') name: string) {
        return this.teamService.findByName(name);
    }

    @Mutation(() => Team)
    async createTeam(@Arg('input') input: CreateTeamInput) {
        return this.teamService.create(input);
    }

    @Mutation(() => Team)
    async updateTeam(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdateTeamInput
    ) {
        return this.teamService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deleteTeam(@Arg('id', () => Int) id: number) {
        return this.teamService.delete(id);
    }
}