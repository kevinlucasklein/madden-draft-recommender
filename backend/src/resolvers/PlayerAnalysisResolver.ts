import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { PlayerAnalysisService } from '../services/PlayerAnalysisService';
import { CreatePlayerAnalysisInput, UpdatePlayerAnalysisInput } from '../inputs/PlayerAnalysisInput';

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
}