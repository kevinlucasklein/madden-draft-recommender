import { Resolver, Query, Mutation, Arg, Int } from "type-graphql";
import { Service } from 'typedi';
import { DraftData } from "../entities/DraftData";
import { DraftDataService } from "../services/DraftDataService";
import { CreateDraftDataInput, UpdateDraftDataInput } from "../inputs/DraftDataInput";

@Service()
@Resolver(DraftData)
export class DraftDataResolver {
    constructor(
        private draftDataService: DraftDataService
    ) {}

    @Query(() => [DraftData])
    async draftData(): Promise<DraftData[]> {
        return this.draftDataService.findAll();
    }

    @Query(() => DraftData, { nullable: true })
    async draftDataById(
        @Arg("player_id", () => Int) player_id: number
    ): Promise<DraftData | null> {
        return this.draftDataService.findOneById(player_id);
    }

    @Mutation(() => DraftData)
    async createDraftData(
        @Arg("input") input: CreateDraftDataInput
    ): Promise<DraftData> {
        return this.draftDataService.create(input);
    }

    @Mutation(() => DraftData)
    async updateDraftData(
        @Arg("player_id", () => Int) player_id: number,
        @Arg("input") input: UpdateDraftDataInput
    ): Promise<DraftData> {
        return this.draftDataService.update(player_id, input);
    }

    @Mutation(() => Boolean)
    async deleteDraftData(
        @Arg("player_id", () => Int) player_id: number
    ): Promise<boolean> {
        return this.draftDataService.delete(player_id);
    }
}