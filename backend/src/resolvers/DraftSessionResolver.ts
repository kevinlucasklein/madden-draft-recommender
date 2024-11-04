import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { DraftSession } from '../entities/DraftSession';
import { DraftSessionService } from '../services/DraftSessionService';
import { CreateDraftSessionInput, UpdateDraftSessionInput } from '../inputs/DraftSessionInput';

@Service()
@Resolver(of => DraftSession)
export class DraftSessionResolver {
    constructor(
        private sessionService: DraftSessionService
    ) {}

    @Query(() => [DraftSession])
    async draftSessions() {
        return this.sessionService.findAll();
    }

    @Query(() => DraftSession, { nullable: true })
    async draftSession(@Arg('id', () => Int) id: number) {
        return this.sessionService.findOne(id);
    }

    @Query(() => DraftSession, { nullable: true })
    async activeDraftSession() {
        return this.sessionService.findActive();
    }

    @Mutation(() => DraftSession)
    async createDraftSession(@Arg('input') input: CreateDraftSessionInput) {
        return this.sessionService.create(input);
    }

    @Mutation(() => DraftSession)
    async updateDraftSession(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdateDraftSessionInput
    ) {
        return this.sessionService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deleteDraftSession(@Arg('id', () => Int) id: number) {
        return this.sessionService.delete(id);
    }
}