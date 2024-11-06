
<script lang="ts">
    import { onMount } from 'svelte';
    import { client } from '../apollo/client';
    import { GET_PLAYERS_WITH_ANALYSIS } from '../lib/graphql/queries/playerAnalysis';
    import { ANALYZE_ALL_PLAYERS } from '../lib/graphql/queries/analyzeAllPlayers';

    interface PositionScore {
        position: string;
        score: number;
    }

    interface TopPosition {
        position: string;
        score: number;
    }

    interface PlayerAnalysis {
        bestPosition: string;
        normalizedScore: number;
        topPositions: PositionScore[];
        viablePositionCount: number;
        primaryArchetype: string;
        secondaryArchetype?: string;
        specialTraits: string[];
        versatilePositions: string[];
    }

    interface Player {
        id: string;
        firstName: string;
        lastName: string;
        age: number;
        position: {
            name: string;
        };
        ratings: {
            overall: number;
        };
        analysis: PlayerAnalysis;
    }

    let loading = true;
    let error: any = null;
    let players: Player[] = [];
    let analyzing = false;
    
    async function handleAnalyzeAll() {
        analyzing = true;
        try {
            await client.mutate({
                mutation: ANALYZE_ALL_PLAYERS
            });
            // Refetch the data
            await client.refetchQueries({
                include: [GET_PLAYERS_WITH_ANALYSIS],
            });
        } catch (error) {
            console.error('Error analyzing players:', error);
        } finally {
            analyzing = false;
        }
    }

    onMount(async () => {
        try {
            loading = true;
            const result = await client.query({
                query: GET_PLAYERS_WITH_ANALYSIS
            });
            players = result.data.players;
        } catch (e) {
            error = e;
        } finally {
            loading = false;
        }
    });

    function parseTopPositions(topPositions: any): TopPosition[] {
        if (typeof topPositions === 'string') {
            return JSON.parse(topPositions);
        }
        return topPositions;
    }
</script>

<div class="mb-4">
    <button 
        class="btn btn-primary" 
        on:click={handleAnalyzeAll} 
        disabled={analyzing}
    >
        {analyzing ? 'Analyzing...' : 'Analyze All Players'}
    </button>
</div>

<div class="overflow-x-auto">
    <table class="table w-full">
        <thead>
            <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Current Position</th>
                <th>Overall</th>
                <th>Best Position</th>
                <th>Score</th>
                <th>Viable Positions</th>
                <th>Archetype</th>
                <th>Special Traits</th>
            </tr>
        </thead>
        <tbody>
            {#if loading}
                <tr><td colspan="9">Loading...</td></tr>
            {:else if error}
                <tr><td colspan="9">Error: {error.message}</td></tr>
            {:else}
                {#each players as player}
                    <tr>
                        <td>{player.firstName} {player.lastName}</td>
                        <td>{player.age}</td>
                        <td>{player.position.name}</td>
                        <td>{player.ratings.overall}</td>
                        <td>
                            {#if player.analysis?.bestPosition}
                                <span class="font-bold {player.position.name !== player.analysis.bestPosition ? 'text-yellow-500' : ''}">
                                    {player.analysis.bestPosition}
                                </span>
                            {:else}
                                <span class="text-gray-400">N/A</span>
                            {/if}
                        </td>
                        <td>
                            {#if player.analysis?.topPositions}
                                <div class="flex flex-wrap gap-1">
                                    {#each parseTopPositions(player.analysis.topPositions).filter(pos => pos?.position !== player.analysis?.bestPosition) as pos}
                                        <span class="badge badge-sm">
                                            {pos.position} ({pos.score?.toFixed(1) ?? 'N/A'})
                                        </span>
                                    {/each}
                                </div>
                            {:else}
                                <span class="text-gray-400">No alternate positions</span>
                            {/if}
                        </td>
                        <td>
                            <div>
                                <span class="font-semibold">{player.analysis.primaryArchetype}</span>
                                {#if player.analysis.secondaryArchetype}
                                    <span class="text-sm text-gray-500">
                                        / {player.analysis.secondaryArchetype}
                                    </span>
                                {/if}
                            </div>
                        </td>
                        <td>
                            <div class="flex flex-wrap gap-1">
                                {#each player.analysis.specialTraits as trait}
                                    <span class="badge badge-accent badge-sm">{trait}</span>
                                {/each}
                            </div>
                        </td>
                    </tr>
                {/each}
            {/if}
        </tbody>
    </table>
</div>

<style>
</style>