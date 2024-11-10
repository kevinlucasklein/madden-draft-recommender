import { Resolver, Query, Mutation, Arg, Int, FieldResolver, Root, Float } from 'type-graphql';
import { Service } from 'typedi';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { PlayerAnalysisService } from '../services/PlayerAnalysisService';
import { Position } from '../config/positionStats'; // Add this import
import { GraphQLJSONObject } from 'graphql-type-json';

@Service()
@Resolver(of => PlayerAnalysis)
export class PlayerAnalysisResolver {
    constructor(
        private analysisService: PlayerAnalysisService
    ) {}

    @Query(() => PlayerAnalysis, { nullable: true })
    async playerAnalysisByPlayer(@Arg('playerId', () => Int) playerId: number) {
        return this.analysisService.findByPlayer(playerId);
    }

    // Add this mutation for single position
    @Mutation(() => Boolean)
    async calculatePositionAnalysis(@Arg("position") position: string): Promise<boolean> {
        try {
            await this.analysisService.calculatePreDraftScores(position);
            return true;
        } catch (error) {
            console.error('Error calculating position analysis:', error);
            return false;
        }
    }

    // Keep existing calculateAllPositionScores or use this renamed version
    @Mutation(() => Boolean)
    async calculateAllPositionsAnalysis(): Promise<boolean> {
        try {
            await this.analysisService.calculateAllPositionScores();
            return true;
        } catch (error) {
            console.error('Error calculating all positions:', error);
            return false;
        }
    }

    // Add this query to check results
    @Query(() => [PlayerAnalysis])
    async getPlayerAnalysesByPosition(@Arg("position") position: string): Promise<PlayerAnalysis[]> {
        return this.analysisService.getAnalysesByPosition(position as Position);
    }

    @FieldResolver(() => Float)
    async normalizedScore(@Root() analysis: PlayerAnalysis): Promise<number> {
        return analysis.normalizedScore;
    }

    @FieldResolver(() => GraphQLJSONObject)
    async positionScores(@Root() analysis: PlayerAnalysis): Promise<Record<string, number>> {
        return analysis.positionScores || {};
    }
}