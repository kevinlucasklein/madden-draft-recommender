import { Resolver, Query, Arg, Int } from 'type-graphql';
import { DraftRecommendation } from '../entities/DraftRecommendation';
import { AppDataSource } from '../config/database';

@Resolver(of => DraftRecommendation)
export class DraftRecommendationResolver {
    @Query(() => [DraftRecommendation])
    async draftRecommendations() {
        const repository = AppDataSource.getRepository(DraftRecommendation);
        return await repository.find({
            relations: {
                session: true,
                player: true
            }
        });
    }

    @Query(() => DraftRecommendation, { nullable: true })
    async draftRecommendation(@Arg('id', () => Int) id: number) {
        const repository = AppDataSource.getRepository(DraftRecommendation);
        return await repository.findOne({
            where: { id },
            relations: {
                session: true,
                player: true
            }
        });
    }
}