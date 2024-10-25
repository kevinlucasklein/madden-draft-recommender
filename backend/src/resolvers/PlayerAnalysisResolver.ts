import { Resolver, Query } from 'type-graphql';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { AppDataSource } from '../config/database';

@Resolver(of => PlayerAnalysis)
export class PlayerAnalysisResolver {
    @Query(() => [PlayerAnalysis])
    async playerAnalyses() {
        const playerAnalysisRepository = AppDataSource.getRepository(PlayerAnalysis);
        return await playerAnalysisRepository.find({
            relations: {
                player: true,
                rating: true
            }
        });
    }
}