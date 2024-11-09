import { Resolver, Query, Arg, Mutation } from "type-graphql";
import { Service } from 'typedi';
import { DraftBoardResponse } from "../entities/DraftBoard";
import { DraftBoardService } from "../services/DraftBoardService";

@Service()
@Resolver()
export class DraftBoardResolver {
    constructor(
        private draftBoardService: DraftBoardService
    ) {}

    @Query(() => DraftBoardResponse)
    async getDraftBoard(
        @Arg('roundNumber') roundNumber: number
    ): Promise<DraftBoardResponse> {
        return this.draftBoardService.getDraftBoard(roundNumber);
    }

    @Mutation(() => DraftBoardResponse)
    async refreshDraftBoard(
        @Arg('roundNumber') roundNumber: number
    ): Promise<DraftBoardResponse> {
        return this.draftBoardService.refreshDraftBoard(roundNumber);
    }

    @Mutation(() => Boolean)
    async clearDraftBoardCache(
        @Arg('roundNumber', { nullable: true }) roundNumber?: number
    ): Promise<boolean> {
        await this.draftBoardService.clearCache(roundNumber);
        return true;
    }
}