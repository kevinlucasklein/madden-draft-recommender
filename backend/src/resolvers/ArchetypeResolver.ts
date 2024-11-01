import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { Archetype } from '../entities/Archetype';
import { ArchetypeService } from '../services/ArchetypeService';
import { CreateArchetypeInput, UpdateArchetypeInput } from '../inputs/ArchetypeInput';

@Service()
@Resolver(of => Archetype)
export class ArchetypeResolver {
    constructor(
        private archetypeService: ArchetypeService
    ) {}

    @Query(() => [Archetype])
    async archetypes() {
        return this.archetypeService.findAll();
    }

    @Query(() => Archetype, { nullable: true })
    async archetype(@Arg('id', () => Int) id: number) {
        return this.archetypeService.findOne(id);
    }

    @Mutation(() => Archetype)
    async createArchetype(@Arg('input') input: CreateArchetypeInput) {
        return this.archetypeService.create(input);
    }

    @Mutation(() => Archetype)
    async updateArchetype(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdateArchetypeInput
    ) {
        return this.archetypeService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deleteArchetype(@Arg('id', () => Int) id: number) {
        return this.archetypeService.delete(id);
    }
}