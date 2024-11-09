<script lang="ts">
    import { client } from '../apollo/client';
    import { GET_DRAFT_BOARD, REFRESH_DRAFT_BOARD } from './graphql/queries/draftBoard';
    import type { DraftBoardRound } from './graphql/queries/draftBoard';

    export let currentRound: number = 1;
    let loading = false;
    let error: string | null = null;
    let draftBoard: DraftBoardRound | null = null;
    
    // Track current position
    let currentPosition: string | undefined = undefined;

    // Function to set current position
    function setCurrentPosition(position: string | undefined) {
        currentPosition = position;
    }

    async function loadDraftBoard() {
        loading = true;
        error = null;
        
        try {
            const result = await client.query({
                query: GET_DRAFT_BOARD,
                variables: { roundNumber: currentRound }
            });
            
            draftBoard = result.data.getDraftBoard;
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load draft board';
        } finally {
            loading = false;
        }
    }

    // Add refresh function
    async function refreshDraftBoard() {
        loading = true;
        error = null;
        
        try {
            const result = await client.mutate({
                mutation: REFRESH_DRAFT_BOARD,
                variables: { roundNumber: currentRound }
            });
            
            draftBoard = result.data.refreshDraftBoard;
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to refresh draft board';
        } finally {
            loading = false;
        }
    }

    // Add round navigation
    function nextRound() {
        if (currentRound < 7) { // Assuming 7 rounds in draft
            currentRound++;
        }
    }

    function previousRound() {
        if (currentRound > 1) {
            currentRound--;
        }
    }

    $: if (currentRound) {
        loadDraftBoard();
    }
</script>

<div class="draft-board">
    <div class="draft-board-header">
        <h3>Round {currentRound} Draft Board</h3>
        <div class="controls">
            <button 
                class="round-nav" 
                on:click={previousRound} 
                disabled={currentRound <= 1}
            >
                ←
            </button>
            <button 
                class="refresh-button" 
                on:click={refreshDraftBoard}
                disabled={loading}
            >
                🔄 Refresh
            </button>
            <button 
                class="round-nav" 
                on:click={nextRound} 
                disabled={currentRound >= 7}
            >
                →
            </button>
        </div>
    </div>
    
    <!-- Position filter buttons -->
    <div class="position-filters">
        <button 
            class:active={currentPosition === undefined} 
            on:click={() => setCurrentPosition(undefined)}
        >
            All Positions
        </button>
        {#each ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P'] as pos}
            <button 
                class:active={currentPosition === pos}
                on:click={() => setCurrentPosition(pos)}
            >
                {pos}
            </button>
        {/each}
    </div>
    
    {#if loading}
        <div class="loading">Loading draft board...</div>
    {:else if error}
        <div class="error">{error}</div>
    {:else if draftBoard}
        <div class="draft-grid">
            {#each draftBoard.picks as pick}
                <div 
                    class="draft-card" 
                    class:best-available={currentPosition !== undefined && 
                        pick.player.analysis?.bestPosition === currentPosition}
                    class:position-match={currentPosition !== undefined && 
                        pick.player.ratings[0]?.position.code === currentPosition}
                >
                    <div class="pick-number">
                        Pick {pick.round_pick} (Overall: {pick.overall_pick})
                    </div>
                    <div class="player-name">
                        {pick.player.firstName} {pick.player.lastName}
                    </div>
                    <div class="player-details">
                        <div class="position">
                            {pick.player.ratings[0]?.position.name}
                            {#if pick.player.analysis?.bestPosition !== pick.player.ratings[0]?.position.name}
                                → {pick.player.analysis?.bestPosition}
                            {/if}
                        </div>
                        <div class="rating">
                            OVR: {pick.player.ratings[0]?.overallRating}
                        </div>
                    </div>
                    <div class="archetype">
                        {pick.player.analysis?.primaryArchetype}
                        {#if pick.player.analysis?.secondaryArchetype}
                            / {pick.player.analysis?.secondaryArchetype}
                        {/if}
                    </div>
                    {#if pick.player.analysis?.viablePositions?.length > 0}
                        <div class="viable-positions">
                            Can play: 
                            {pick.player.analysis.viablePositions
                                .map(vp => `${vp.position} (${vp.score.toFixed(1)}%)`)
                                .join(', ')}
                        </div>
                    {/if}
                    {#if pick.player.analysis?.specialTraits?.length > 0}
                        <div class="traits">
                            Traits: {pick.player.analysis.specialTraits.join(', ')}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {:else}
        <div class="empty">No draft data available</div>
    {/if}
</div>

<style>
    .draft-board {
        padding: 20px;
        background: #2c3e50;
        border-radius: 8px;
    }

    .draft-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 15px;
        padding: 15px;
    }

    .draft-card {
        background: #34495e;
        border-radius: 6px;
        padding: 15px;
        color: white;
        transition: transform 0.2s;
    }

    .draft-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .best-available {
        border: 2px solid #2ecc71;
    }

    .position-match {
        border: 2px solid #3498db;
    }

    .pick-number {
        font-size: 0.9em;
        color: #95a5a6;
        margin-bottom: 5px;
    }

    .player-name {
        font-size: 1.2em;
        font-weight: bold;
        margin-bottom: 10px;
    }

    .player-details {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .position {
        color: #3498db;
    }

    .rating {
        color: #e74c3c;
    }

    .archetype {
        font-style: italic;
        color: #f1c40f;
        margin-bottom: 8px;
    }

    .viable-positions {
        font-size: 0.9em;
        color: #bdc3c7;
        margin-bottom: 8px;
    }

    .traits {
        font-size: 0.9em;
        color: #2ecc71;
    }

    .position-filters {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 15px;
        padding: 10px;
        background: #34495e;
        border-radius: 6px;
    }

    .position-filters button {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        background: #2c3e50;
        color: white;
        cursor: pointer;
        transition: all 0.2s;
    }

    .position-filters button.active {
        background: #2ecc71;
    }

    .position-filters button:hover {
        background: #27ae60;
    }

    .loading, .error, .empty {
        text-align: center;
        padding: 20px;
        color: white;
    }

    .error {
        color: #e74c3c;
    }

    h3 {
        color: white;
        margin-bottom: 15px;
    }
</style>