import { Resolver, Query, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { RosterOptimizationService } from '../services/RosterOptimizationService';
import { DraftSessionService } from '../services/DraftSessionService';

@Service()
@Resolver()
export class RosterOptimizationResolver {
    constructor(
        private rosterOptimizationService: RosterOptimizationService,
        private sessionService: DraftSessionService
    ) {}

    @Query(() => Object)
    async optimizedRoster(
        @Arg('sessionId', () => Int) sessionId: number
    ) {
        // Fetch session with picks using the service
        const session = await this.sessionService.findOne(sessionId, {
            relations: {  // Add this relations key
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
            optimizedRoster: Object.fromEntries(optimizedRoster),
            positionNeeds
        };
    }
}