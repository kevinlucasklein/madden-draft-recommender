import { Resolver, Query } from 'type-graphql';
import { Position } from '../entities/Position';
import { AppDataSource } from '../config/database';
import { Service } from 'typedi';

@Service()
@Resolver(of => Position)
export class PositionResolver {
    @Query(() => [Position])
    async positions() {
        const positionRepository = AppDataSource.getRepository(Position);
        return await positionRepository.find();
    }
}