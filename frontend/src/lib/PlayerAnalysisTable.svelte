
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
        positionScores: Record<string, number>;  // Add this linef
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
        ratings: {  // Change this to array
            overall: number;
        }[];  // Add array notation
        analysis: PlayerAnalysis;
    }

    let loading = true;
    let error: any = null;
    let players: Player[] = [];
    let analyzing = false;

        // Add filter states
        let filters = {
        name: '',
        age: { min: 0, max: 99 },
        currentPosition: '',
        overall: { min: 0, max: 99 },
        bestPosition: ''
    };

    // Filtered players computed property
    $: filteredPlayers = players.filter(player => {
        // Name filter
        if (filters.name && !`${player.firstName} ${player.lastName}`.toLowerCase().includes(filters.name.toLowerCase())) {
            return false;
        }
        
        // Age filter
        if (player.age < filters.age.min || player.age > filters.age.max) {
            return false;
        }
        
        // Current position filter
        if (filters.currentPosition && player.position.name !== filters.currentPosition) {
            return false;
        }
        
        // Overall rating filter
        const overall = player.ratings[0]?.overall ?? 0;
        if (overall < filters.overall.min || overall > filters.overall.max) {
            return false;
        }
        
        // Best position filter
        if (filters.bestPosition && player.analysis?.bestPosition !== filters.bestPosition) {
            return false;
        }
        
        return true;
    });

    // Get unique positions for dropdowns
    $: positions = [...new Set(players.map(p => p.position.name))].sort();
    $: bestPositions = [...new Set(players.filter(p => p.analysis?.bestPosition).map(p => p.analysis.bestPosition))].sort();
    
    async function handleAnalyzeAll() {
    analyzing = true;
    try {
        console.log('Starting player analysis...');
        const result = await client.mutate({
            mutation: ANALYZE_ALL_PLAYERS
        });
        console.log('Analysis mutation result:', result);
        
        if (!result.data?.analyzeAllPlayers) {
            throw new Error('Analysis failed');
        }
        
        console.log('Analysis complete, waiting before refetch...');
        
        // Wait a moment for the database to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Refetching data...');
        // Refetch the data
        const queryResult = await client.refetchQueries({
            include: [GET_PLAYERS_WITH_ANALYSIS],
        });
        
        console.log('Data refetched:', queryResult);
        
        // Update the local players array
        const newData = await client.query({
            query: GET_PLAYERS_WITH_ANALYSIS,
            fetchPolicy: 'network-only'
        });
        players = newData.data.players;
        
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

<div class="mb-4 flex items-center gap-4">
    <button 
        class="btn btn-primary" 
        on:click={handleAnalyzeAll} 
        disabled={analyzing}
    >
        {#if analyzing}
            <div class="loading loading-spinner loading-xs mr-2"></div>
            Analyzing Players...
        {:else}
            Analyze All Players
        {/if}
    </button>
</div>

<div class="overflow-x-auto">
    <table class="table w-full">
        <thead>
            <tr>
                <!-- Filter row -->
                <th>
                    <input 
                        type="text" 
                        class="input input-bordered input-sm w-full" 
                        placeholder="Search name..."
                        bind:value={filters.name}
                    />
                </th>
                <th>
                    <div class="flex gap-1">
                        <input 
                            type="number" 
                            class="input input-bordered input-sm w-16" 
                            placeholder="Min"
                            bind:value={filters.age.min}
                        />
                        <input 
                            type="number" 
                            class="input input-bordered input-sm w-16" 
                            placeholder="Max"
                            bind:value={filters.age.max}
                        />
                    </div>
                </th>
                <th>
                    <select 
                        class="select select-bordered select-sm w-full"
                        bind:value={filters.currentPosition}
                    >
                        <option value="">All</option>
                        {#each positions as position}
                            <option value={position}>{position}</option>
                        {/each}
                    </select>
                </th>
                <th>
                    <div class="flex gap-1">
                        <input 
                            type="number" 
                            class="input input-bordered input-sm w-16" 
                            placeholder="Min"
                            bind:value={filters.overall.min}
                        />
                        <input 
                            type="number" 
                            class="input input-bordered input-sm w-16" 
                            placeholder="Max"
                            bind:value={filters.overall.max}
                        />
                    </div>
                </th>
                <th>
                    <select 
                        class="select select-bordered select-sm w-full"
                        bind:value={filters.bestPosition}
                    >
                        <option value="">All</option>
                        {#each bestPositions as position}
                            <option value={position}>{position}</option>
                        {/each}
                    </select>
                </th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
            </tr>
            <!-- Column headers -->
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
                {#each filteredPlayers as player}
                    <tr>
                        <td>{player.firstName} {player.lastName}</td>
                        <td>{player.age}</td>
                        <td>{player.position.name}</td>
                        <td>{player.ratings[0]?.overall ?? 'N/A'}</td>
                        <td>
                            {#if player.analysis?.positionScores && player.analysis?.bestPosition}
                                <span class="badge badge-lg badge-primary mb-1">
                                    {player.analysis.bestPosition} ({player.analysis.positionScores[player.analysis.bestPosition].toFixed(2)})
                                </span>
                            {/if}
                        </td>
                        <td>
                            {#if player.analysis?.positionScores}
                                <div class="flex flex-wrap gap-1">
                                    {#each Object.entries(player.analysis.positionScores)
                                        .sort(([, a], [, b]) => b - a)
                                        .filter(([, score]) => score > 0) as [position, score]}
                                        <span class="badge badge-sm {position === player.analysis.bestPosition ? 'badge-primary' : ''}">
                                            {position} ({score.toFixed(2)})
                                        </span>
                                    {/each}
                                </div>
                            {:else}
                                <span class="text-gray-400">No viable positions</span>
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