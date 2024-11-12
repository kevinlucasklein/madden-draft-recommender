import { Resolver, Query, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { RosterOptimizationService } from '../services/RosterOptimizationService';
import { DraftSessionService } from '../services/DraftSessionService';
import { OptimizedRosterResponse } from '../entities/RosterOptimization';

@Service()
@Resolver()
export class RosterOptimizationResolver {
    constructor(
        private rosterOptimizationService: RosterOptimizationService,
        private sessionService: DraftSessionService
    ) {}

    @Query(() => OptimizedRosterResponse)
    async optimizedRoster(
        @Arg('sessionId', () => Int) sessionId: number
    ): Promise<OptimizedRosterResponse> {
        const session = await this.sessionService.findOne(sessionId, {
            relations: {
                picks: {
                    player: {
                        analysis: true,
                        ratings: {
                            position: true
                        }
                    }
                }
            }
        });
    
        if (!session) {
            throw new Error('Session not found');
        }
    
        const optimizedRoster = this.rosterOptimizationService.optimizeRoster(session.picks || []);
        const positionNeeds = this.rosterOptimizationService.getPositionalNeeds(
            optimizedRoster,
            session.getRosterNeeds()
        );
    
        return {
            optimizedRoster: Array.from(optimizedRoster.entries()),
            positionNeeds: Object.entries(positionNeeds)
        };
    }
}