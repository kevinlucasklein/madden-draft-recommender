import { DraftPick } from '../types/DraftPick';

export class DraftPickCalculator {
    private static readonly TOTAL_TEAMS = 32;
    
    static calculateAllPicks(
        firstRoundPick: number, 
        totalRounds: number = 54,
        isSnakeDraft: boolean = true
    ): DraftPick[] {
        const picks: DraftPick[] = [];
        
        for (let round = 1; round <= totalRounds; round++) {
            let pick: number;
            
            if (!isSnakeDraft) {
                pick = firstRoundPick;
            } else {
                // For even rounds, reverse the pick order
                pick = (round % 2 === 0) ? 
                    (this.TOTAL_TEAMS - firstRoundPick + 1) : 
                    firstRoundPick;
            }
            
            // Calculate overall pick
            const overall = ((round - 1) * this.TOTAL_TEAMS) + pick;

            picks.push({
                round,
                pick,
                overall
            });
        }
        
        return picks;
    }
}