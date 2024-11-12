import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Service } from 'typedi';
import { DraftSession } from '../entities/DraftSession';
import { DraftSessionService } from '../services/DraftSessionService';
import { CreateDraftSessionInput, UpdateDraftSessionInput } from '../inputs/DraftSessionInput';
import { DEFAULT_ROSTER_NEEDS } from '../types/RosterNeeds';
import { DraftPick } from '../entities/DraftPick';
import { Player } from '../entities/Player';
import { DraftPickService } from '../services/DraftPickService';
import { RosterOptimizationService } from '../services/RosterOptimizationService';

@Service()
@Resolver(of => DraftSession)
export class DraftSessionResolver {
    constructor(
        private sessionService: DraftSessionService,
        private draftPickService: DraftPickService,
        private rosterOptimizationService: RosterOptimizationService
    ) {}

    @Query(() => [DraftSession])
    async draftSessions() {
        return this.sessionService.findAll();
    }

    @Query(() => DraftSession)
    async draftSession(@Arg('id') id: number): Promise<DraftSession> {
        const session = await this.sessionService.findOne(id, {
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
    
        return session;
    }

    @Query(() => DraftSession, { nullable: true })
    async activeDraftSession() {
        return this.sessionService.findActive();
    }

    @Mutation(() => DraftSession)
    async createDraftSession(
        @Arg('input') input: CreateDraftSessionInput
    ): Promise<DraftSession> {
        const session = new DraftSession();
        session.draftPosition = input.draftPosition;
        session.status = 'active';
        session.rosterNeeds = JSON.stringify(DEFAULT_ROSTER_NEEDS);
        
        return this.sessionService.create(session);
    }

    @Mutation(() => DraftSession)
    async updateDraftSession(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdateDraftSessionInput
    ) {
        return this.sessionService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deleteDraftSession(@Arg('id', () => Int) id: number) {
        return this.sessionService.delete(id);
    }

    @Mutation(() => DraftSession)
    async addDraftPick(
        @Arg('sessionId') sessionId: number,
        @Arg('playerId') playerId: number,
        @Arg('position') position: string,
        @Arg('roundNumber', () => Int) roundNumber: number,
        @Arg('pickNumber', () => Int) pickNumber: number
    ): Promise<DraftSession> {
        // First find without relations for quick check
        const session = await this.sessionService.findOne(sessionId);
        
        if (!session) {
            throw new Error('Session not found');
        }
    
        // Create draft pick
        await this.draftPickService.create({
            sessionId: session.id,
            playerId,
            roundNumber,
            pickNumber,
            draftedPosition: position
        });
    
        // Get updated session with all relations
        const updatedSession = await this.sessionService.findOne(sessionId, {
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
    
        if (!updatedSession) {
            throw new Error('Session not found after update');
        }
    
        // Optimize roster after new pick
        const optimizedRoster = await this.rosterOptimizationService.optimizeRoster(updatedSession.picks ?? []);
        const positionNeeds = await this.rosterOptimizationService.getPositionalNeeds(
            optimizedRoster,
            updatedSession.getRosterNeeds()
        );
    
        // Update roster needs based on optimized positions
        const rosterNeeds = updatedSession.getRosterNeeds();
        Object.entries(positionNeeds).forEach(([pos, need]) => {
            if (rosterNeeds[pos]) {
                rosterNeeds[pos].current = need.currentPlayers.length;
            }
        });
    
        // Save the updated roster needs
        updatedSession.rosterNeeds = JSON.stringify(rosterNeeds);
        await this.sessionService.update(updatedSession.id, {
            rosterNeeds: updatedSession.rosterNeeds
        });
    
        return updatedSession;
    }
}