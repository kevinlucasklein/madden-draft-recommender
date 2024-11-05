import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { DraftRecommendation } from '../entities/DraftRecommendation';
import { 
    CreateDraftRecommendationInput, 
    UpdateDraftRecommendationInput,
    GenerateRecommendationsInput 
} from '../inputs';
import { AppDataSource } from '../config/database';
import { Player } from '../entities/Player';
import { DraftSession } from '../entities/DraftSession';
import { Not, In } from 'typeorm';
import { Service } from 'typedi';
import { DraftRecommendationService } from '../services/DraftRecommendationService';

@Service()
@Resolver(of => DraftRecommendation)
export class DraftRecommendationResolver {
    constructor(
        private recommendationService: DraftRecommendationService
    ) {}

    @Query(() => [DraftRecommendation])
    async draftRecommendations() {
        return this.recommendationService.findAll();
    }

    @Query(() => DraftRecommendation, { nullable: true })
    async draftRecommendation(@Arg('id', () => Int) id: number) {
        return this.recommendationService.findOne(id);
    }

    @Query(() => [DraftRecommendation])
    async recommendationsForPick(
        @Arg('sessionId', () => Int) sessionId: number,
        @Arg('roundNumber', () => Int) roundNumber: number,
        @Arg('pickNumber', () => Int) pickNumber: number
    ) {
        return this.recommendationService.findForPick(sessionId, roundNumber, pickNumber);
    }

    @Mutation(() => [DraftRecommendation])
    async generateRecommendations(
        @Arg('input') input: GenerateRecommendationsInput
    ): Promise<DraftRecommendation[]> {
        return this.recommendationService.generate(input);
    }

    @Mutation(() => DraftRecommendation)
    async createDraftRecommendation(
        @Arg('input') input: CreateDraftRecommendationInput
    ) {
        return this.recommendationService.create(input);
    }

    @Mutation(() => DraftRecommendation)
    async updateDraftRecommendation(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdateDraftRecommendationInput
    ) {
        return this.recommendationService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deleteDraftRecommendation(@Arg('id', () => Int) id: number) {
        return this.recommendationService.delete(id);
    }
}