import { Resolver, Query, Arg, Int } from 'type-graphql';
import { DraftSession } from '../entities/DraftSession';
import { AppDataSource } from '../config/database';

@Resolver(of => DraftSession)
export class DraftSessionResolver {
    @Query(() => [DraftSession])
    async draftSessions() {
        const repository = AppDataSource.getRepository(DraftSession);
        return await repository.find({
            relations: {
                picks: true,
                recommendations: true
            }
        });
    }

    @Query(() => DraftSession, { nullable: true })
    async draftSession(@Arg('id', () => Int) id: number) {
        const repository = AppDataSource.getRepository(DraftSession);
        return await repository.findOne({
            where: { id },
            relations: {
                picks: true,
                recommendations: true
            }
        });
    }
}