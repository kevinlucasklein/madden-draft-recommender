import { Resolver, Query, Mutation, Arg, Int, FieldResolver, Root, Float } from 'type-graphql';
import { Service } from 'typedi';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { PlayerAnalysisService } from '../services/PlayerAnalysisService';
import { CreatePlayerAnalysisInput, UpdatePlayerAnalysisInput } from '../inputs/PlayerAnalysisInput';
import { GraphQLJSONObject } from 'graphql-type-json';

@Service()
@Resolver(of => PlayerAnalysis)
export class PlayerAnalysisResolver {
    constructor(
        private analysisService: PlayerAnalysisService
    ) {}

    @Query(() => [PlayerAnalysis])
    async playerAnalyses() {
        return this.analysisService.findAll();
    }

    @Query(() => PlayerAnalysis, { nullable: true })
    async playerAnalysis(@Arg('id', () => Int) id: number) {
        return this.analysisService.findOne(id);
    }

    @Query(() => PlayerAnalysis, { nullable: true })
    async playerAnalysisByPlayer(@Arg('playerId', () => Int) playerId: number) {
        return this.analysisService.findByPlayer(playerId);
    }

    @Mutation(() => PlayerAnalysis)
    async createPlayerAnalysis(@Arg('input') input: CreatePlayerAnalysisInput) {
        return this.analysisService.create(input);
    }

    @Mutation(() => PlayerAnalysis)
    async updatePlayerAnalysis(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdatePlayerAnalysisInput
    ) {
        return this.analysisService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deletePlayerAnalysis(@Arg('id', () => Int) id: number) {
        return this.analysisService.delete(id);
    }

    @Mutation(() => Boolean)
    async updatePlayerAnalysisRanks() {
        await this.analysisService.updateRanks();
        return true;
    }

    @Mutation(() => Boolean)
    async analyzeAllPlayers(): Promise<boolean> {
        console.log('analyzeAllPlayers mutation called');
        try {
            await this.analysisService.analyzeAllPlayers();
            console.log('Analysis completed successfully');
            return true;
        } catch (error) {
            console.error('Error in analyzeAllPlayers mutation:', error);
            return false;
        }
    }

    @Mutation(() => PlayerAnalysis)
    async analyzePlayer(
        @Arg('playerId') playerId: number
    ): Promise<PlayerAnalysis> {
        return this.analysisService.analyzePlayer(playerId);
    }

    @FieldResolver(() => Float)  // Add this decorator if not present
    async normalizedScore(@Root() analysis: PlayerAnalysis): Promise<number> {
        return analysis.normalizedScore;
    }

    @FieldResolver(() => GraphQLJSONObject)
    async positionScores(@Root() analysis: PlayerAnalysis): Promise<Record<string, number>> {
        return analysis.positionScores || {};
    }
}
