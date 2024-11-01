import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { DraftPick } from '../entities/DraftPick';
import { DraftPickService } from '../services/DraftPickService';
import { CreateDraftPickInput, UpdateDraftPickInput } from '../inputs/DraftPickInput';

@Service()
@Resolver(of => DraftPick)
export class DraftPickResolver {
    constructor(
        private draftPickService: DraftPickService
    ) {}

    @Query(() => [DraftPick])
    async draftPicks() {
        return this.draftPickService.findAll();
    }

    @Query(() => DraftPick, { nullable: true })
    async draftPick(@Arg('id', () => Int) id: number) {
        return this.draftPickService.findOne(id);
    }

    @Query(() => [DraftPick])
    async draftPicksBySession(@Arg('sessionId', () => Int) sessionId: number) {
        return this.draftPickService.findBySession(sessionId);
    }

    @Mutation(() => DraftPick)
    async createDraftPick(@Arg('input') input: CreateDraftPickInput) {
        return this.draftPickService.create(input);
    }

    @Mutation(() => DraftPick)
    async updateDraftPick(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdateDraftPickInput
    ) {
        return this.draftPickService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deleteDraftPick(@Arg('id', () => Int) id: number) {
        return this.draftPickService.delete(id);
    }
}