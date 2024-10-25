import { Resolver, Query } from 'type-graphql';
import { Team } from '../entities/Team';
import { AppDataSource } from '../config/database';

@Resolver(of => Team)
export class TeamResolver {
    @Query(() => [Team])
    async teams() {
        const teamRepository = AppDataSource.getRepository(Team);
        return await teamRepository.find();
    }
}