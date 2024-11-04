import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { Position } from '../entities/Position';
import { PositionService } from '../services/PositionService';
import { CreatePositionInput, UpdatePositionInput } from '../inputs/PositionInput';

@Service()
@Resolver(of => Position)
export class PositionResolver {
    constructor(
        private positionService: PositionService
    ) {}

    @Query(() => [Position])
    async positions() {
        return this.positionService.findAll();
    }

    @Query(() => Position, { nullable: true })
    async position(@Arg('id', () => Int) id: number) {
        return this.positionService.findOne(id);
    }

    @Query(() => [Position])
    async positionsByType(@Arg('type') type: string) {
        return this.positionService.findByType(type);
    }

    @Mutation(() => Position)
    async createPosition(@Arg('input') input: CreatePositionInput) {
        return this.positionService.create(input);
    }

    @Mutation(() => Position)
    async updatePosition(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdatePositionInput
    ) {
        return this.positionService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deletePosition(@Arg('id', () => Int) id: number) {
        return this.positionService.delete(id);
    }
}