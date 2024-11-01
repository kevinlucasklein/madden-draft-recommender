import { Resolver, Query, Arg, Int } from 'type-graphql';
import { RosterRequirement } from '../entities/RosterRequirement';
import { AppDataSource } from '../config/database';
import { Service } from 'typedi';

@Service()
@Resolver(of => RosterRequirement)
export class RosterRequirementResolver {
    @Query(() => [RosterRequirement])
    async rosterRequirements() {
        const repository = AppDataSource.getRepository(RosterRequirement);
        return await repository.find();
    }

    @Query(() => RosterRequirement, { nullable: true })
    async rosterRequirement(@Arg('id', () => Int) id: number) {
        const repository = AppDataSource.getRepository(RosterRequirement);
        return await repository.findOne({ where: { id } });
    }
}