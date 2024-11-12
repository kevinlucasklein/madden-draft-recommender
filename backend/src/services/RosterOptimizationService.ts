import { Injectable } from '@nestjs/common';
import { Player } from '../entities/Player';
import { DraftPick } from '../entities/DraftPick';
import { Service } from 'typedi';

interface PositionAssignment {
    player: Player;
    position: string;
    score: number;
    isSecondaryPosition: boolean;
}

@Service()
export class RosterOptimizationService {
    optimizeRoster(draftPicks: DraftPick[]): Map<string, PositionAssignment[]> {
        const roster = new Map<string, PositionAssignment[]>();
        const players = draftPicks.map(pick => pick.player);

        // First pass: Assign players to their best positions
        players.forEach(player => {
            const assignments = this.getPlayerPositionAssignments(player);
            assignments.forEach(assignment => {
                if (!roster.has(assignment.position)) {
                    roster.set(assignment.position, []);
                }
                roster.get(assignment.position)?.push(assignment);
            });
        });

        // Sort each position group by score
        roster.forEach((assignments, position) => {
            assignments.sort((a, b) => b.score - a.score);
        });

        return roster;
    }

    private getPlayerPositionAssignments(player: Player): PositionAssignment[] {
        const assignments: PositionAssignment[] = [];
        const analysis = player.analysis;

        if (!analysis) return assignments;

        // Add base position
        const basePosition = player.ratings?.[0]?.position?.name;
        if (basePosition) {
            assignments.push({
                player,
                position: basePosition,
                score: analysis.adjustedScore || 0,
                isSecondaryPosition: false
            });
        }

        // Add secondary positions
        if (analysis.secondaryPositions) {
            analysis.secondaryPositions.forEach(sp => {
                if (sp.isElite || sp.tier <= 2) { // Only consider elite or tier 1-2 secondary positions
                    assignments.push({
                        player,
                        position: sp.position,
                        score: sp.score,
                        isSecondaryPosition: true
                    });
                }
            });
        }

        return assignments;
    }

    getPositionalNeeds(
        roster: Map<string, PositionAssignment[]>,
        rosterNeeds: Record<string, { min: number; max: number; current: number }>
    ): Record<string, { 
        needed: number;
        priority: number;
        currentPlayers: Array<{ 
            name: string;
            score: number;
            isSecondary: boolean;
        }>;
    }> {
        const needs: Record<string, any> = {};

        Object.entries(rosterNeeds).forEach(([position, requirement]) => {
            const positionPlayers = roster.get(position) || [];
            const currentCount = positionPlayers.length;
            const needed = requirement.min - currentCount;
            
            needs[position] = {
                needed: Math.max(0, needed),
                priority: this.calculatePositionPriority(needed, requirement, positionPlayers),
                currentPlayers: positionPlayers.map(p => ({
                    name: `${p.player.firstName} ${p.player.lastName}`,
                    score: p.score,
                    isSecondary: p.isSecondaryPosition
                }))
            };
        });

        return needs;
    }

    private calculatePositionPriority(
        needed: number,
        requirement: { min: number; max: number; current: number },
        currentPlayers: PositionAssignment[]
    ): number {
        let priority = 1.0;

        // Increase priority if we're below minimum
        if (needed > 0) {
            priority *= (1 + (0.2 * needed));
        }

        // Decrease priority if we're at or above maximum
        if (currentPlayers.length >= requirement.max) {
            priority *= 0.3;
        }

        // Adjust priority based on current player quality
        const hasElitePlayer = currentPlayers.some(p => p.score >= 85 && !p.isSecondaryPosition);
        if (!hasElitePlayer && needed <= 0) {
            priority *= 1.2; // Slight boost if we need quality upgrade
        }

        // Adjust for secondary position reliance
        const secondaryCount = currentPlayers.filter(p => p.isSecondaryPosition).length;
        if (secondaryCount > 0) {
            priority *= (1 + (0.1 * secondaryCount)); // Slight boost if relying on secondary positions
        }

        return priority;
    }
}