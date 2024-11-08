
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
        positionRanks: Record<string, number>;
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
    // Add a filter for which position rank to display
    let selectedRankPosition = '';

        // Add filter states
        let filters = {
        name: '',
        age: { min: 0, max: 99 },
        currentPosition: '',
        overall: { min: 0, max: 99 },
        bestPosition: '',
        rankPosition: '' // Add this
    };

    // Add sorting functionality
    let sortBy = 'name';
    let sortDirection: 'asc' | 'desc' = 'asc';

    // Add position mapping for grouped positions
    const positionGroups = {
        'DE': ['RE', 'LE'],
        'DT': ['DT', 'NT'],
        'G': ['LG', 'RG'],
        'T': ['LT', 'RT'],
        'OLB': ['LOLB', 'ROLB'],
    };

    // Helper function to get all specific positions for a group
    function getSpecificPositions(groupPosition: string): string[] {
        return positionGroups[groupPosition as keyof typeof positionGroups] || [groupPosition];
    }

    // Helper function to get normalized position
    function getNormalizedPosition(position: string): string {
        return positionToGroup[position] || position;
    }

    // Helper function to get position rank considering position groups
    function getPositionRank(player: Player, position: string): number | null {
        if (!player.analysis?.positionRanks) return null;

        // If it's a grouped position, find the best rank among the specific positions
        const specificPositions = getSpecificPositions(position);
        if (specificPositions.length > 1) {
            const ranks = specificPositions
                .map(pos => player.analysis.positionRanks[pos])
                .filter(rank => rank !== undefined);
            return ranks.length > 0 ? Math.min(...ranks) : null;
        }

        // Otherwise return the direct position rank
        return player.analysis.positionRanks[position] || null;
    }

    // Filtered players computed property
    $: filteredPlayers = players
        .filter(player => {
        // Name filter
        if (filters.name && !`${player.firstName} ${player.lastName}`.toLowerCase().includes(filters.name.toLowerCase())) {
            return false;
        }
        
        // Age filter
        if (player.age < filters.age.min || player.age > filters.age.max) {
            return false;
        }
        
        // Current position filter with normalization
        if (filters.currentPosition) {
            const normalizedCurrentPos = getNormalizedPosition(player.position.name);
            if (normalizedCurrentPos !== filters.currentPosition) {
                return false;
            }
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
        })
        .sort((a, b) => {
            if (filters.rankPosition) {
                const rankA = getPositionRank(a, filters.rankPosition) || Infinity;
                const rankB = getPositionRank(b, filters.rankPosition) || Infinity;
                return rankA - rankB;
            }
            return 0;
        });

    // Get unique positions for dropdowns
    // Get unique positions for dropdowns, using normalized positions
    $: positions = [...new Set(players.map(p => getNormalizedPosition(p.position.name)))].sort();
    $: bestPositions = [...new Set(players.filter(p => p.analysis?.bestPosition).map(p => p.analysis.bestPosition))].sort();

    // Create reverse mapping for easy lookup
    const positionToGroup = Object.entries(positionGroups).reduce((acc, [group, positions]) => {
        positions.forEach(pos => {
            acc[pos] = group;
        });
        return acc;
    }, {} as Record<string, string>);
    
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

    // Update the position display in the table
    function formatPosition(position: string): string {
        const group = positionToGroup[position];
        return group ? `${position} (${group})` : position;
    }

    // Update the position ranks display in the table
    function formatPositionRanks(player: Player, position: string | null = null): string[] {
        if (!player.analysis?.positionRanks) return [];

        if (position) {
            // Show ranks for specific position group
            const specificPositions = getSpecificPositions(position);
            return specificPositions
                .map(pos => ({
                    position: pos,
                    rank: player.analysis.positionRanks[pos]
                }))
                .filter(({rank}) => rank !== undefined)
                .map(({position, rank}) => `${position}: #${rank}`);
        }

        // Show all ranks
        return Object.entries(player.analysis.positionRanks)
            .map(([pos, rank]) => `${pos}: #${rank}`);
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

    <!-- Add position rank filter -->
    <select 
        class="select select-bordered select-sm"
        bind:value={filters.rankPosition}
    >
        <option value="">Show All Positions</option>
        {#each positions as position}
            <option value={position}>{position} Rankings</option>
        {/each}
    </select>
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
                <th>Viable Positions</th>
                <th>Archetype</th>
                <th>Position Rank</th>  <!-- Add this column -->
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
                        <td>{formatPosition(player.position.name)}</td>
                        <td>{player.ratings[0]?.overall ?? 'N/A'}</td>
                        <td>
                            {#if player.analysis?.positionScores && player.analysis?.bestPosition}
                                <span class="badge badge-lg badge-primary mb-1">
                                    {player.analysis.bestPosition} ({player.analysis.positionScores[player.analysis.bestPosition].toFixed(2)})
                                </span>
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
                        <td>
                            {#if filters.rankPosition}
                                <!-- Show ranks for selected position group -->
                                {#if formatPositionRanks(player, filters.rankPosition).length > 0}
                                    <div class="flex flex-wrap gap-1">
                                        {#each formatPositionRanks(player, filters.rankPosition) as rankText}
                                            <span class="badge badge-lg">{rankText}</span>
                                        {/each}
                                    </div>
                                {:else}
                                    <span class="text-gray-400">N/A</span>
                                {/if}
                            {:else}
                                <!-- Show all position ranks -->
                                <div class="flex flex-wrap gap-1">
                                    {#each formatPositionRanks(player) as rankText}
                                        <span class="badge badge-sm">{rankText}</span>
                                    {/each}
                                </div>
                            {/if}
                        </td>
                    </tr>
                {/each}
            {/if}
        </tbody>
    </table>
</div>

<style>
</style>