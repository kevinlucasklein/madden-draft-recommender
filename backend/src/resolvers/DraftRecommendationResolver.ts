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

@Resolver(of => DraftRecommendation)
export class DraftRecommendationResolver {
    // Basic queries
    @Query(() => [DraftRecommendation])
    async draftRecommendations() {
        const repository = AppDataSource.getRepository(DraftRecommendation);
        return await repository.find({
            relations: {
                session: true,
                player: true
            }
        });
    }

    @Query(() => DraftRecommendation, { nullable: true })
    async draftRecommendation(@Arg('id', () => Int) id: number) {
        const repository = AppDataSource.getRepository(DraftRecommendation);
        return await repository.findOne({
            where: { id },
            relations: {
                session: true,
                player: true
            }
        });
    }

    // Get recommendations for a specific session and pick
    @Query(() => [DraftRecommendation])
    async recommendationsForPick(
        @Arg('sessionId', () => Int) sessionId: number,
        @Arg('roundNumber', () => Int) roundNumber: number,
        @Arg('pickNumber', () => Int) pickNumber: number
    ) {
        const repository = AppDataSource.getRepository(DraftRecommendation);
        return await repository.find({
            where: {
                session: { id: sessionId },
                roundNumber,
                pickNumber
            },
            relations: {
                session: true,
                player: {
                    stats: true,
                    analysis: true,
                    ratings: true
                }
            },
            order: {
                recommendationScore: 'DESC'
            }
        });
    }

    // Generate new recommendations
    @Mutation(() => [DraftRecommendation])
    async generateRecommendations(
        @Arg('input') input: GenerateRecommendationsInput
    ): Promise<DraftRecommendation[]> {
        const sessionRepo = AppDataSource.getRepository(DraftSession);
        const playerRepo = AppDataSource.getRepository(Player);
        const recommendationRepo = AppDataSource.getRepository(DraftRecommendation);

        // Get the draft session and its needs
        const session = await sessionRepo.findOneOrFail({
            where: { id: input.sessionId }
        });

        // Get drafted player IDs
        const draftedPlayerIds = await AppDataSource
            .createQueryBuilder()
            .select('player_id')
            .from('draft_picks', 'dp')
            .where('dp.session_id = :sessionId', { sessionId: input.sessionId })
            .getRawMany();

        const draftedIds = draftedPlayerIds.map(p => p.player_id);

        // Get available players
        const availablePlayers = await playerRepo.find({
            where: draftedIds.length > 0 ? {
                id: Not(In(draftedIds))
            } : {},
            relations: {
                analysis: true,
                stats: true,
                ratings: true
            }
        });

        // Calculate recommendations
        const recommendations: DraftRecommendation[] = [];
        const rosterNeeds = JSON.parse(session.rosterNeeds) as Record<string, number>;

        for (const player of availablePlayers) {
            if (!player.analysis?.normalizedScore) continue;

            // Calculate recommendation score
            let recommendationScore = player.analysis.normalizedScore;
            
            // Only access suggestedPosition if it exists
            if (player.analysis.suggestedPosition) {
                const positionNeed = rosterNeeds[player.analysis.suggestedPosition] || 0;
                recommendationScore *= (positionNeed > 0 ? 1.2 : 0.8);
            }

            // Create recommendation
            const recommendation = recommendationRepo.create({
                session: { id: input.sessionId },
                player: { id: player.id },
                roundNumber: input.roundNumber,
                pickNumber: input.pickNumber,
                recommendationScore,
                reason: player.analysis.suggestedPosition 
                    ? `${player.analysis.suggestedPosition} - ${player.analysis.playerType || 'Unknown Type'}`
                    : 'Position not specified'
            });

            recommendations.push(recommendation);
        }

        // Sort and limit recommendations
        recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
        const limitedRecommendations = recommendations.slice(0, input.limit || 10);

        // Save recommendations
        return await recommendationRepo.save(limitedRecommendations);
    }

    // Create single recommendation
    @Mutation(() => DraftRecommendation)
    async createDraftRecommendation(
        @Arg('input') input: CreateDraftRecommendationInput
    ): Promise<DraftRecommendation> {
        const repository = AppDataSource.getRepository(DraftRecommendation);
        
        const recommendation = repository.create({
            session: { id: input.sessionId },
            player: { id: input.playerId },
            roundNumber: input.roundNumber,
            pickNumber: input.pickNumber,
            recommendationScore: input.recommendationScore,
            reason: input.reason
        });

        return await repository.save(recommendation);
    }

    // Update recommendation
    @Mutation(() => DraftRecommendation)
    async updateDraftRecommendation(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdateDraftRecommendationInput
    ): Promise<DraftRecommendation> {
        const repository = AppDataSource.getRepository(DraftRecommendation);
        
        const recommendation = await repository.findOneOrFail({
            where: { id },
            relations: {
                session: true,
                player: true
            }
        });

        if (input.recommendationScore !== undefined) {
            recommendation.recommendationScore = input.recommendationScore;
        }
        if (input.reason) {
            recommendation.reason = input.reason;
        }

        return await repository.save(recommendation);
    }
}