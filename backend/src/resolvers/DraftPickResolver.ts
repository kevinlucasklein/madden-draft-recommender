import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { DraftPick } from '../entities/DraftPick';
import { CreateDraftPickInput, UpdateDraftPickInput } from '../inputs';
import { AppDataSource } from '../config/database';

@Resolver(of => DraftPick)
export class DraftPickResolver {
    // Existing queries
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

    // New mutations
    @Mutation(() => DraftPick)
    async createDraftPick(
        @Arg('input') input: CreateDraftPickInput
    ): Promise<DraftPick> {
        const repository = AppDataSource.getRepository(DraftPick);
        
        const pick = repository.create({
            session: { id: input.sessionId },
            player: { id: input.playerId },
            roundNumber: input.roundNumber,
            pickNumber: input.pickNumber,
            draftedPosition: input.draftedPosition,
            pickedAt: new Date()
        });

        return await repository.save(pick);
    }

    @Mutation(() => DraftPick)
    async updateDraftPick(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdateDraftPickInput
    ): Promise<DraftPick> {
        const repository = AppDataSource.getRepository(DraftPick);
        
        const pick = await repository.findOneOrFail({
            where: { id },
            relations: {
                session: true,
                player: true
            }
        });

        if (input.playerId) {
            pick.player = { id: input.playerId } as any;
        }
        if (input.roundNumber !== undefined) {
            pick.roundNumber = input.roundNumber;
        }
        if (input.pickNumber !== undefined) {
            pick.pickNumber = input.pickNumber;
        }
        if (input.draftedPosition) {
            pick.draftedPosition = input.draftedPosition;
        }

        return await repository.save(pick);
    }

    @Query(() => [DraftPick])
    async draftPicksBySession(
        @Arg('sessionId', () => Int) sessionId: number
    ) {
        const repository = AppDataSource.getRepository(DraftPick);
        return await repository.find({
            where: {
                session: { id: sessionId }
            },
            relations: {
                session: true,
                player: true
            },
            order: {
                roundNumber: 'ASC',
                pickNumber: 'ASC'
            }
        });
    }
}