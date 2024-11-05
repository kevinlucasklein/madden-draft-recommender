<script lang="ts">
    import { client } from '../apollo/client';
    import { onMount } from 'svelte';
    import { GENERATE_RECOMMENDATIONS } from './graphql/queries/draftRecommendations';
    import { CREATE_DRAFT_SESSION } from './graphql/queries/createDraftSession';
    import { GET_ROSTER_REQUIREMENTS } from './graphql/queries/rosterRequirements';
    import { CREATE_DRAFT_PICK, GET_DRAFT_PICKS_BY_SESSION } from './graphql/queries/draftPicks';
    interface Position {
        name: string;
        code: string;
    }

    interface Rating {
        overallRating: number;  // Changed from overall
        position: Position;
    }

    interface DraftData {
        overall_pick: number;
        round: number;
        round_pick: number;
    }

    interface Player {
        id: number;
        firstName: string | null;
        lastName: string | null;
        ratings: Rating[];      // Changed to array
        draftData: DraftData;
    }

    interface Recommendation {
        id: number;
        player: Player;
        recommendationScore: number;
        reason: string;
    }

    interface RosterRequirement {
        position: string;
        minimumPlayers: number;
        maximumPlayers: number;
        positionGroup: string;
        isRequired: boolean;
    }

    interface DraftedPlayer {
        player: Player;
        round: number;
        pick: number;
        overall: number;
    }

    type UnitName = 'Offense' | 'Defense' | 'Special Teams';
    type PositionGroups = Record<UnitName, string[]>;

    const POSITION_GROUPS: PositionGroups = {
        'Offense': ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'],
        'Defense': ['LE', 'DT', 'RE', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS'],
        'Special Teams': ['K', 'P']
    } as const;

    // Store recommendations
    // Store recommendations
    let recommendations: Recommendation[] = [];

    let rosterRequirements: RosterRequirement[] = [];
    let draftedPlayers: DraftedPlayer[] = [];
    let currentRosterCounts: Record<string, number> = {};

    // Form inputs - simplified
    let sessionId: number | null = null;
    let firstRoundPick: number = 1;
    let isSnakeDraft: boolean = true;
    let limit: number = 5;
    let loading = false;
    let error: string | null = null;
    let sessionStarted = false;

    // Add constant for teams
    const TOTAL_TEAMS = 32;

    // Current draft position tracking
    let currentRound: number = 1;
    let currentPick: number = 1;

    function calculateCurrentPick(round: number, firstPick: number, snake: boolean): number {
        if (!snake) {
            return firstPick;
        }
        
        // For even-numbered rounds, reverse the pick order
        if (round % 2 === 0) {
            return TOTAL_TEAMS - firstPick + 1;
        }
        
        // For odd-numbered rounds, use the original pick
        return firstPick;
    }

    async function nextPick() {
        if (currentRound < 54) {
            currentRound++;
            currentPick = calculateCurrentPick(currentRound, firstRoundPick, isSnakeDraft);
            
            try {
                const result = await client.mutate({
                    mutation: GENERATE_RECOMMENDATIONS,
                    variables: {
                        input: {
                            sessionId,
                            roundNumber: currentRound,
                            pickNumber: currentPick,
                            isSnakeDraft,
                            limit
                        }
                    }
                });
                
                recommendations = result.data.generateRecommendations;
            } catch (e) {
                error = e instanceof Error ? e.message : 'An unknown error occurred';
            }
        }
    }

    async function previousPick() {
        if (currentRound > 1) {
            currentRound--;
            currentPick = calculateCurrentPick(currentRound, firstRoundPick, isSnakeDraft);
            
            try {
                const result = await client.mutate({
                    mutation: GENERATE_RECOMMENDATIONS,
                    variables: {
                        input: {
                            sessionId,
                            roundNumber: currentRound,
                            pickNumber: currentPick,
                            isSnakeDraft,
                            limit
                        }
                    }
                });
                
                recommendations = result.data.generateRecommendations;
            } catch (e) {
                error = e instanceof Error ? e.message : 'An unknown error occurred';
            }
        }
    }

    async function loadDraftPicks() {
        if (sessionId) {
            try {
                const result = await client.query({
                    query: GET_DRAFT_PICKS_BY_SESSION,
                    variables: { sessionId }
                });
                
                draftedPlayers = result.data.draftPicksBySession.map((pick: any) => ({
                    player: pick.player,
                    round: pick.roundNumber,
                    pick: pick.pickNumber,
                    overall: ((pick.roundNumber - 1) * TOTAL_TEAMS) + pick.pickNumber
                }));
                
                updateRosterCounts();
            } catch (e) {
                error = e instanceof Error ? e.message : 'Failed to load draft picks';
            }
        }
    }

    async function createDraftSession() {
        try {
            const result = await client.mutate({
                mutation: CREATE_DRAFT_SESSION,
                variables: {
                    input: {
                        draftPosition: firstRoundPick,
                        status: 'ACTIVE',
                        rosterNeeds: JSON.stringify({})
                    }
                }
            });
            
            sessionId = result.data.createDraftSession.id;
            return sessionId;
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to create draft session';
            throw e;
        }
    }

    async function handleSubmit() {
        loading = true;
        error = null;
        
        try {
            sessionId = await createDraftSession();
            currentPick = calculateCurrentPick(currentRound, firstRoundPick, isSnakeDraft);
            sessionStarted = true;
            
            await loadDraftPicks(); 
            
            const result = await client.mutate({
                mutation: GENERATE_RECOMMENDATIONS,
                variables: {
                    input: {
                        sessionId,
                        roundNumber: currentRound,
                        pickNumber: currentPick,
                        isSnakeDraft,
                        limit
                    }
                }
            });
            
            recommendations = result.data.generateRecommendations;
        } catch (e) {
            error = e instanceof Error ? e.message : 'An unknown error occurred';
            sessionStarted = false;
        } finally {
            loading = false;
        }
    }

    onMount(async () => {
        try {
            const result = await client.query({
                query: GET_ROSTER_REQUIREMENTS
            });
            rosterRequirements = result.data.rosterRequirements;
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load roster requirements';
        }
    });

    function updateRosterCounts() {
        currentRosterCounts = draftedPlayers.reduce((acc, dp) => {
            const position = dp.player.ratings[0]?.position?.code || 'Unknown';
            acc[position] = (acc[position] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }

    async function draftPlayer(recommendation: Recommendation) {
        try {
            // Create draft pick in backend
            const result = await client.mutate({
                mutation: CREATE_DRAFT_PICK,
                variables: {
                    input: {
                        sessionId,
                        playerId: recommendation.player.id,
                        roundNumber: currentRound,
                        pickNumber: currentPick,
                        draftedPosition: recommendation.player.ratings[0]?.position?.code || 'Unknown'
                    }
                }
            });

            // Update local state
            const draftedPlayer: DraftedPlayer = {
                player: recommendation.player,
                round: currentRound,
                pick: currentPick,
                overall: ((currentRound - 1) * TOTAL_TEAMS) + currentPick
            };

            draftedPlayers = [...draftedPlayers, draftedPlayer];
            updateRosterCounts();
            
            // Move to next pick
            await nextPick();
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to draft player';
        }
    }

    function undoLastPick() {
        draftedPlayers = draftedPlayers.slice(0, -1);
        updateRosterCounts();
    }

    function getDraftedPlayersByPosition(): Record<string, DraftedPlayer[]> {
        // Sort positions in a logical football order
        const positionOrder = [
            'QB', 'HB', 'FB', 
            'WR', 'TE', 
            'LT', 'LG', 'C', 'RG', 'RT', 
            'LE', 'RE', 'DT', 
            'LOLB', 'MLB', 'ROLB',
            'CB', 'FS', 'SS',
            'K', 'P'
        ];

        // Group players by position
        const grouped = draftedPlayers.reduce((acc, player) => {
            const position = player.player.ratings[0]?.position?.code || 'Unknown';
            if (!acc[position]) {
                acc[position] = [];
            }
            acc[position].push(player);
            return acc;
        }, {} as Record<string, DraftedPlayer[]>);

        // Sort positions according to positionOrder
        return Object.fromEntries(
            Object.entries(grouped).sort(([posA], [posB]) => {
                const indexA = positionOrder.indexOf(posA);
                const indexB = positionOrder.indexOf(posB);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            })
        );
    }

    function getDraftedPlayersByGroup(): Record<UnitName, Record<string, DraftedPlayer[]>> {
        const grouped: Record<UnitName, Record<string, DraftedPlayer[]>> = {
            'Offense': {},
            'Defense': {},
            'Special Teams': {}
        };

        draftedPlayers.forEach(player => {
            const position = player.player.ratings[0]?.position?.code || 'Unknown';
            let group: UnitName = 'Offense'; // default value

            for (const [groupName, positions] of Object.entries(POSITION_GROUPS)) {
                if (positions.includes(position)) {
                    group = groupName as UnitName;
                    break;
                }
            }

            if (!grouped[group][position]) {
                grouped[group][position] = [];
            }
            grouped[group][position].push(player);
        });

        return grouped;
    }
</script>

<div class="draft-recommender">
    <h2>Draft Recommender</h2>
    
    <form on:submit|preventDefault={handleSubmit} class="recommendation-form">
        <div class="form-group">
            <label for="firstRoundPick">Your First Round Pick:</label>
            <input 
                type="number" 
                id="firstRoundPick" 
                bind:value={firstRoundPick} 
                min="1" 
                max={TOTAL_TEAMS}
                required
            >
        </div>

        <!-- Remove totalTeams input -->

        <div class="form-group">
            <label>
                <input type="checkbox" bind:checked={isSnakeDraft}>
                Snake Draft
            </label>
        </div>

        <div class="form-group">
            <label for="limit">Number of Recommendations:</label>
            <input 
                type="number" 
                id="limit" 
                bind:value={limit} 
                min="1" 
                max="10" 
                required
            >
        </div>

        <button type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Start Draft'}
        </button>
    </form>

    {#if recommendations.length > 0}
        <div class="draft-status-container">
            <button on:click={previousPick} disabled={currentRound === 1}>
                Previous Pick
            </button>
            <span>Round {currentRound}, Pick {currentPick} {#if isSnakeDraft}(Snake Draft){/if}</span>
            <button on:click={nextPick} disabled={currentRound >= 54}>
                Next Pick
            </button>
        </div>

        <div class="roster-status">
            <h3>Current Roster</h3>
            <div class="roster-grid">
                {#each rosterRequirements as req}
                    <div class="roster-position">
                        <span class="position">{req.position}</span>
                        <span class="count">
                            {currentRosterCounts[req.position] || 0}/{req.maximumPlayers}
                        </span>
                        {#if (currentRosterCounts[req.position] || 0) < req.minimumPlayers}
                            <span class="warning">Need {req.minimumPlayers - (currentRosterCounts[req.position] || 0)} more</span>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>

        <div class="draft-status-container">
            <div class="drafted-players">
                <h3>Drafted Players</h3>
                {#if draftedPlayers.length > 0}
                    <div class="units-container">
                        {#each Object.entries(getDraftedPlayersByGroup()) as [groupName, positions]}
                            <div class="unit">
                                <h4 class="unit-header">{groupName}</h4>
                                <div class="positions-row">
                                    {#each POSITION_GROUPS[groupName as UnitName] as position}
                                        <div class="position-column">
                                            <h5 class="position-header">{position}</h5>
                                            {#if positions[position]?.length}
                                                <div class="position-players">
                                                    {#each positions[position] as dp}
                                                        <div class="drafted-player">
                                                            <div class="player-name">{dp.player.firstName} {dp.player.lastName}</div>
                                                            <div class="player-rating">OVR: {dp.player.ratings[0]?.overallRating}</div>
                                                            <div class="player-pick">R{dp.round}P{dp.pick}</div>
                                                        </div>
                                                    {/each}
                                                </div>
                                            {:else}
                                                <div class="empty-position">-</div>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>
                    <button class="undo-button" on:click={undoLastPick}>Undo Last Pick</button>
                {:else}
                    <p class="no-players">No players drafted yet</p>
                {/if}
            </div>
        </div>
    {/if}

    {#if error}
        <div class="error">
            Error: {error}
        </div>
    {/if}

    {#if recommendations.length > 0}
    <div class="recommendations">
        <h3>Recommended Players</h3>
        <div class="recommendations-grid">
            {#each recommendations as rec}
                <div class="recommendation-card">
                    <h4>{rec.player.firstName || ''} {rec.player.lastName || ''}</h4>
                    <p>Position: {rec.player.ratings?.[0]?.position?.name || 'Unknown'}</p>
                    <p>Overall Rating: {rec.player.ratings?.[0]?.overallRating || 'N/A'}</p>
                    <p>Historical Draft Position: 
                        {#if rec.player.draftData}
                            Round {rec.player.draftData.round}, 
                            Pick {rec.player.draftData.round_pick} 
                            (Overall: {rec.player.draftData.overall_pick})
                        {:else}
                            Not Available
                        {/if}
                    </p>
                    <p>Recommendation Score: {rec.recommendationScore?.toFixed(2) || '0.00'}</p>
                    <p class="reason">Reason: {rec.reason}</p>
                    <button 
                    class="draft-button" 
                    on:click={() => draftPlayer(rec)}
                >
                    Draft Player
                </button>
            </div>
            {/each}
        </div>
    </div>
{/if}
</div>

<style>
    .draft-recommender {
        max-width: 1920px;  /* Increased width */
        margin: 0 auto;
        padding: 20px;
    }

    .recommendation-form {
        display: grid;
        gap: 15px;
        max-width: 400px;
        margin: 20px 0;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    input[type="number"] {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    button {
        padding: 10px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    button:disabled {
        background-color: #cccccc;
    }

    .error {
        color: red;
        margin: 10px 0;
    }

    .recommendations-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }

    .recommendation-card {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        background-color: #f9f9f9;
    }

    .recommendation-card h4 {
        margin: 0 0 10px 0;
        color: #333;
    }

    .recommendation-card p {
        margin: 5px 0;
        color: #666;
    }

    .recommendation-card {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        background-color: #f9f9f9;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.2s;
    }

    .recommendation-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .recommendation-card h4 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 1.2em;
        border-bottom: 2px solid #4CAF50;
        padding-bottom: 5px;
    }

    .recommendation-card p {
        margin: 8px 0;
        color: #666;
        line-height: 1.4;
    }

    .reason {
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px solid #eee;
        font-style: italic;
    }

    .recommendations h3 {
        margin: 30px 0 20px;
        color: #2c3e50;
        text-align: center;
    }

    .roster-status {
        background: #4d4d4d;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
    }

    .roster-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
    }

    .roster-position {
        background: rgb(75, 75, 75);
        padding: 10px;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .warning {
        color: #ff4444;
        font-size: 0.9em;
    }

    .drafted-players {
        margin: 20px 0;
    }

    .drafted-player {
        background: rgb(75, 75, 75);
        padding: 10px;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .draft-button {
        margin-top: 10px;
        background-color: #2196F3;
        width: 100%;
    }

    .draft-button:hover {
        background-color: #1976D2;
    }

    .position-players {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .drafted-player {
        background: white;
        padding: 10px;
        border-radius: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .no-players {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 20px;
    }

    .undo-button {
        margin-top: 20px;
        background-color: #dc3545;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        width: auto;
        align-self: center;
    }

    .undo-button:hover {
        background-color: #c82333;
    }

    .units-container {
        display: flex;
        flex-direction: column;
        gap: 30px;
        margin: 20px 0;
    }

    .unit {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        width: 100%;
    }

    .unit-header {
        margin: 0 0 15px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid #4CAF50;
        color: #2c3e50;
        font-size: 1.2em;
    }

    .positions-row {
        display: flex;  /* Back to flex */
        gap: 10px;
        padding-bottom: 10px;
        width: 100%;  /* Ensure it takes full width */
    }

    .position-column {
        flex: 1;  /* Equal width distribution */
        min-width: 100px;  /* Smaller minimum width */
        max-width: 150px;  /* Add maximum width */
        background: white;
        border-radius: 6px;
        padding: 8px;  /* Slightly smaller padding */
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .position-header {
        margin: 0 0 8px 0;
        text-align: center;
        font-size: 0.9em;
        color: #2c3e50;
        padding: 4px;
        background: #f1f1f1;
        border-radius: 4px;
    }

    .position-players {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .drafted-player {
        background: #f8f9fa;
        padding: 6px;
        border-radius: 4px;
        font-size: 0.85em;
    }

    .player-name {
        font-weight: 500;
        color: #2c3e50;
    }

    .player-rating {
        color: #666;
        font-size: 0.9em;
    }

    .player-pick {
        color: #888;
        font-size: 0.8em;
    }

    .empty-position {
        text-align: center;
        color: #999;
        padding: 10px;
        font-size: 1.2em;
    }

    .undo-button {
        margin: 20px auto 0;
        display: block;
        background-color: #dc3545;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
    }

    /* Add for horizontal scrolling if needed */
    .positions-row::-webkit-scrollbar {
        display: none;
    }

    .positions-row::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
    }

    .positions-row::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }

    .positions-row::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
</style>