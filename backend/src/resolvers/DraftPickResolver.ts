import { Resolver, Query, Arg, Int } from 'type-graphql';
import { DraftPick } from '../entities/DraftPick';
import { AppDataSource } from '../config/database';

@Resolver(of => DraftPick)
export class DraftPickResolver {
    @Query(() => [DraftPick])
    async draftPicks() {
        const repository = AppDataSource.getRepository(DraftPick);
        return await repository.find({
            relations: {
                session: true,
                player: true
            }
        });
    }

    @Query(() => DraftPick, { nullable: true })
    async draftPick(@Arg('id', () => Int) id: number) {
        const repository = AppDataSource.getRepository(DraftPick);
        return await repository.findOne({
            where: { id },
            relations: {
                session: true,
                player: true
            }
        });
    }
}