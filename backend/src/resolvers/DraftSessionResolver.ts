import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { DraftSession } from '../entities/DraftSession';
import { CreateDraftSessionInput, UpdateDraftSessionInput } from '../inputs';
import { AppDataSource } from '../config/database';

@Resolver(of => DraftSession)
export class DraftSessionResolver {
    // Existing queries...
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

    // New mutations
    @Mutation(() => DraftSession)
    async createDraftSession(
        @Arg('input') input: CreateDraftSessionInput
    ): Promise<DraftSession> {
        const repository = AppDataSource.getRepository(DraftSession);
        
        const session = repository.create({
            draftPosition: input.draftPosition,
            status: input.status || 'ACTIVE',
            rosterNeeds: input.rosterNeeds,
            createdAt: new Date()
        });

        return await repository.save(session);
    }

    @Mutation(() => DraftSession)
    async updateDraftSession(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdateDraftSessionInput
    ): Promise<DraftSession> {
        const repository = AppDataSource.getRepository(DraftSession);
        
        const session = await repository.findOneOrFail({
            where: { id },
            relations: {
                picks: true,
                recommendations: true
            }
        });

        if (input.status) {
            session.status = input.status;
        }

        if (input.rosterNeeds) {
            session.rosterNeeds = input.rosterNeeds;
        }

        return await repository.save(session);
    }

    @Mutation(() => Boolean)
    async deleteDraftSession(
        @Arg('id', () => Int) id: number
    ): Promise<boolean> {
        const repository = AppDataSource.getRepository(DraftSession);
        
        try {
            await repository.delete(id);
            return true;
        } catch (error) {
            console.error('Error deleting draft session:', error);
            return false;
        }
    }

    @Query(() => DraftSession, { nullable: true })
    async activeDraftSession() {
        const repository = AppDataSource.getRepository(DraftSession);
        return await repository.findOne({
            where: { status: 'ACTIVE' },
            relations: {
                picks: true,
                recommendations: true
            },
            order: { createdAt: 'DESC' }
        });
    }
}