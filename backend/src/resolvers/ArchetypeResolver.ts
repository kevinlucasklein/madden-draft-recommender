import { Resolver, Query } from 'type-graphql';
import { Archetype } from '../entities/Archetype';
import { AppDataSource } from '../config/database';

@Resolver(of => Archetype)
export class ArchetypeResolver {
    @Query(() => [Archetype])
    async archetypes() {
        const archetypeRepository = AppDataSource.getRepository(Archetype);
        return await archetypeRepository.find();
    }
}