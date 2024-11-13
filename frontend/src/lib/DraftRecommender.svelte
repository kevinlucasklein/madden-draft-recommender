<script lang="ts">
    import { client } from '../apollo/client';
    import { onMount } from 'svelte';
    import { GENERATE_RECOMMENDATIONS } from './graphql/queries/draftRecommendations';
    import { CREATE_DRAFT_SESSION } from './graphql/queries/createDraftSession';
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
        analysis: PlayerAnalysis;  // Add this line
    }

    interface Recommendation {
        id: number;
        player: Player;
        recommendationScore: number;
        reason: string;
    }

    interface DraftedPlayer {
        player: Player;
        round: number;
        pick: number;
        overall: number;
        isSecondary?: boolean;  // Add this
        secondaryScore?: number;  // Add this
    }

    interface RosterNeed {
        position: string;
        needed: number;
        maximum: number;
    }
    // Add these new interfaces
    interface ViablePosition {
        position: string;
        score: number;
        percentageAboveAverage: number;
    }

    interface DraftPick {
        round: number;
        pick: number;
        overall: number;
    }

    interface PlayerAnalysis {
        id: number;
        normalizedScore: number;
        positionScores: Record<string, number>;
        viablePositions: ViablePosition[];
        basePositionTierScore: number;
        positionTier: number;
        ageMultiplier: number;
        developmentMultiplier: number;
        schemeFitScore: number;
        versatilityBonus: number;
        preDraftCompositeScore: number;
        adjustedScore: number;
        secondaryPositions: SecondaryPosition[];
    }

    interface SecondaryPosition {
        position: string;
        score: number;
        tier: number;
        isElite: boolean;
    }

    function getScoreClass(score: number): string {
        if (score >= 85) return 'score-high';
        if (score >= 70) return 'score-medium';
        return 'score-low';
    }

    function formatPosition(position: string): string {
        const positionMap: Record<string, string> = {
            'QB': 'Quarterback',
            'HB': 'Running Back',
            'FB': 'Fullback',
            'WR': 'Wide Receiver',
            'TE': 'Tight End',
            'LT': 'Left Tackle',
            'LG': 'Left Guard',
            'C': 'Center',
            'RG': 'Right Guard',
            'RT': 'Right Tackle',
            'LE': 'Left End',
            'RE': 'Right End',
            'DT': 'Defensive Tackle',
            'LOLB': 'Left OLB',
            'MLB': 'Middle LB',
            'ROLB': 'Right OLB',
            'CB': 'Cornerback',
            'FS': 'Free Safety',
            'SS': 'Strong Safety',
            'K': 'Kicker',
            'P': 'Punter'
        };
        return positionMap[position] || position;
    }

    const rosterRequirements = {
        QB: { min: 1, max: 2, current: 0 },
        WR: { min: 3, max: 6, current: 0 },
        HB: { min: 1, max: 3, current: 0 },
        TE: { min: 1, max: 3, current: 0 },
        LT: { min: 1, max: 2, current: 0 },
        RT: { min: 1, max: 2, current: 0 },
        LG: { min: 1, max: 2, current: 0 },
        RG: { min: 1, max: 2, current: 0 },
        C: { min: 1, max: 2, current: 0 },
        RE: { min: 1, max: 3, current: 0 },
        LE: { min: 1, max: 3, current: 0 },
        DT: { min: 2, max: 4, current: 0 },
        LOLB: { min: 1, max: 2, current: 0 },
        ROLB: { min: 1, max: 2, current: 0 },
        MLB: { min: 1, max: 3, current: 0 },
        CB: { min: 3, max: 6, current: 0 },
        FS: { min: 1, max: 2, current: 0 },
        SS: { min: 1, max: 2, current: 0 },
        K: { min: 1, max: 1, current: 0 },
        P: { min: 1, max: 1, current: 0 },
        FB: { min: 0, max: 1, current: 0 }
    };

    function getTierDescription(tier: number): string {
        switch(tier) {
            case 1: return 'Elite';
            case 2: return 'High Quality';
            case 3: return 'Above Average';
            case 4: return 'Average';
            case 5: return 'Below Average';
            default: return 'Development Needed';
        }
    }

    type UnitName = 'Offense' | 'Defense' | 'Special Teams';
    type PositionGroups = Record<UnitName, string[]>;
    type PositionGroup = keyof typeof POSITION_GROUPS;

    const POSITION_GROUPS: PositionGroups = {
        'Offense': ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'],
        'Defense': ['LE', 'DT', 'RE', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS'],
        'Special Teams': ['K', 'P']
    } as const;

    // Store recommendations
    // Store recommendations
    let recommendations: Recommendation[] = [];
    let rosterNeeds: Record<string, RosterNeed> = {};
    let draftedPlayers: DraftedPlayer[] = [];
    let currentRosterCounts: Record<string, number> = {};
    // Add this to your component's state
    let draftPicks: DraftPick[] = [];
    let currentPickIndex = 0;

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

    // Add this function to generate all picks for the session
    function generateDraftPicks(firstRoundPick: number, isSnakeDraft: boolean): DraftPick[] {
        const TOTAL_ROUNDS = 54;
        const TOTAL_TEAMS = 32;
        const picks: DraftPick[] = [];

        for (let round = 1; round <= TOTAL_ROUNDS; round++) {
            let pick: number;
            
            if (isSnakeDraft) {
                // For even rounds, reverse the order
                if (round % 2 === 0) {
                    pick = TOTAL_TEAMS - firstRoundPick + 1;
                } else {
                    pick = firstRoundPick;
                }
            } else {
                // For non-snake drafts, keep the same pick position
                pick = firstRoundPick;
            }

            picks.push({
                round,
                pick,
                overall: ((round - 1) * TOTAL_TEAMS) + pick
            });
        }

        return picks;
    }

    // Update nextPick function
    async function nextPick() {
        if (currentPickIndex < draftPicks.length - 1) {
            currentPickIndex++;
            const nextDraftPick = draftPicks[currentPickIndex];
            currentRound = nextDraftPick.round;
            currentPick = nextDraftPick.pick;
            
            try {
                const result = await client.query({
                    query: GENERATE_RECOMMENDATIONS,
                    variables: {
                        sessionId,
                        roundNumber: currentRound,
                        pickNumber: currentPick,
                        limit,
                        isSnakeDraft
                    }
                });
                
                recommendations = result.data.draftRecommendations;
            } catch (e) {
                console.error('Error fetching next recommendations:', e);
                error = e instanceof Error ? e.message : 'An unknown error occurred';
            }
        }
    }

    // Also update previousPick function for consistency
    async function previousPick() {
        if (currentPickIndex > 0) {
            currentPickIndex--;
            const prevDraftPick = draftPicks[currentPickIndex];
            currentRound = prevDraftPick.round;
            currentPick = prevDraftPick.pick;
            
            try {
                const result = await client.query({
                    query: GENERATE_RECOMMENDATIONS,
                    variables: {
                        sessionId,
                        roundNumber: currentRound,
                        pickNumber: currentPick,
                        limit,
                        isSnakeDraft
                    }
                });
                
                recommendations = result.data.draftRecommendations;
            } catch (e) {
                console.error('Error fetching previous recommendations:', e);
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
                    draftPosition: firstRoundPick,  // This is from the form
                    status: 'ACTIVE',
                    // isSnakeDraft was missing! Let's add it:
                    isSnakeDraft: isSnakeDraft  // This is from the form checkbox
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

// Then update handleSubmit
    async function handleSubmit() {
        loading = true;
        error = null;
        
        try {
            console.log('Starting draft session...');
            draftPicks = generateDraftPicks(firstRoundPick, isSnakeDraft);
            currentPickIndex = 0;
            
            console.log('Creating draft session...');
            const sessionResult = await createDraftSession();
            sessionId = sessionResult;
            console.log('Session created:', sessionId);
            
            currentRound = draftPicks[currentPickIndex].round;
            currentPick = draftPicks[currentPickIndex].pick;
            sessionStarted = true;
            
            console.log('Loading draft picks...');
            await loadDraftPicks();
            
            console.log('Fetching recommendations...', {
                sessionId,
                roundNumber: currentRound,
                pickNumber: currentPick,
                limit,
                isSnakeDraft
            });

            const result = await client.query({
                query: GENERATE_RECOMMENDATIONS,
                variables: {
                    sessionId,
                    roundNumber: currentRound,
                    pickNumber: currentPick,
                    limit,
                    isSnakeDraft
                }
            });
            
            console.log('Recommendations received:', result.data);
            recommendations = result.data.draftRecommendations;
            
            loading = false;
        } catch (e) {
            console.error('Error in handleSubmit:', e);
            error = e instanceof Error ? e.message : 'An unknown error occurred';
            sessionStarted = false;
            loading = false;
        }
    }

    // Update the updateRosterCounts function to handle secondary positions
    function updateRosterCounts() {
        currentRosterCounts = {};
        
        draftedPlayers.forEach(dp => {
            // Add primary position
            const primaryPosition = dp.player.ratings[0]?.position?.code || 'Unknown';
            currentRosterCounts[primaryPosition] = (currentRosterCounts[primaryPosition] || 0) + 1;
            
            // Add secondary positions if they exist and have a good enough score
            dp.player.analysis?.secondaryPositions?.forEach(secPos => {
                if (secPos.score >= 65) { // Lowered threshold to match Khalil Mack's case
                    currentRosterCounts[secPos.position] = (currentRosterCounts[secPos.position] || 0) + 1;
                }
            });
        });
    }

    // Update the draftPlayer function to properly handle the response
    async function draftPlayer(recommendation: Recommendation) {
        try {
            const position = recommendation.player.ratings[0]?.position?.code || 'Unknown';
            
            const result = await client.mutate({
                mutation: CREATE_DRAFT_PICK,
                variables: {
                    sessionId,
                    playerId: recommendation.player.id,
                    position: position,
                    roundNumber: currentRound,
                    pickNumber: currentPick
                }
            });

            // Update local state with the complete player data
            const draftedPlayer: DraftedPlayer = {
                player: recommendation.player,  // Use the full player data from recommendation
                round: currentRound,
                pick: currentPick,
                overall: draftPicks[currentPickIndex].overall
            };

            draftedPlayers = [...draftedPlayers, draftedPlayer];
            
            // Parse the rosterNeeds JSON if it's returned as a string
            if (typeof result.data.addDraftPick.rosterNeeds === 'string') {
                rosterNeeds = JSON.parse(result.data.addDraftPick.rosterNeeds);
            } else {
                rosterNeeds = result.data.addDraftPick.rosterNeeds;
            }
            
            updateRosterCounts();
            await nextPick();
        } catch (e) {
            console.error('Error drafting player:', e);
            error = e instanceof Error ? e.message : 'Failed to draft player';
        }
    }

    function undoLastPick() {
        draftedPlayers = draftedPlayers.slice(0, -1);
        updateRosterCounts();
    }

    // Update getDraftedPlayersByPosition to use lower threshold
    function getDraftedPlayersByPosition(): Record<string, DraftedPlayer[]> {
        console.log("Starting getDraftedPlayersByPosition");
        
        const positionOrder = [
            'QB', 'HB', 'FB', 
            'WR', 'TE', 
            'LT', 'LG', 'C', 'RG', 'RT', 
            'LE', 'RE', 'DT', 
            'LOLB', 'MLB', 'ROLB',
            'CB', 'FS', 'SS',
            'K', 'P'
        ];

        const grouped: Record<string, DraftedPlayer[]> = {};
        
        draftedPlayers.forEach(player => {
            console.log(`Processing player:`, {
                name: `${player.player.firstName} ${player.player.lastName}`,
                primaryPosition: player.player.ratings[0]?.position?.code,
                secondaryPositions: player.player.analysis?.secondaryPositions
            });

            const primaryPosition = player.player.ratings[0]?.position?.code || 'Unknown';
            if (!grouped[primaryPosition]) {
                grouped[primaryPosition] = [];
            }
            grouped[primaryPosition].push({
                ...player,
                isSecondary: false
            });
            console.log(`Added to primary position ${primaryPosition}`);

            // Changed threshold from 70 to 65
            player.player.analysis?.secondaryPositions?.forEach(secPos => {
                console.log(`Checking secondary position:`, {
                    position: secPos.position,
                    score: secPos.score,
                    threshold: 65  // Updated this value
                });
                
                if (secPos.score >= 65) {  // Updated this value
                    if (!grouped[secPos.position]) {
                        grouped[secPos.position] = [];
                    }
                    grouped[secPos.position].push({
                        ...player,
                        isSecondary: true,
                        secondaryScore: secPos.score
                    });
                    console.log(`Added to secondary position ${secPos.position}`);
                }
            });
        });

        console.log("Final grouped positions:", grouped);
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

    // Add function to check if position is at maximum
    function isPositionAtMaximum(position: string): boolean {
        const count = currentRosterCounts[position] || 0;
        return count >= (rosterNeeds[position]?.maximum || 0);
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
        <button on:click={previousPick} disabled={currentPickIndex === 0}>
            Previous Pick
        </button>
        <span>
            Round {currentRound}, Pick {currentPick} 
            (Overall #{draftPicks[currentPickIndex]?.overall})
            {#if isSnakeDraft}(Snake Draft){/if}
        </span>
        <button on:click={nextPick} disabled={currentPickIndex >= draftPicks.length - 1}>
            Next Pick
        </button>
    </div>

    <div class="recommendations">
        <h3>Recommended Players</h3>
        <div class="recommendations-grid">
            {#each recommendations as rec}
                <div class="recommendation-card">
                    <h4>{rec.player.firstName || ''} {rec.player.lastName || ''}</h4>
                    
                    <div class="player-base-info">
                        <div>
                            <strong>{formatPosition(rec.player.ratings?.[0]?.position?.name || 'Unknown')}</strong>
                            <div class={getScoreClass(rec.player.ratings?.[0]?.overallRating || 0)}>
                                {rec.player.ratings?.[0]?.overallRating || 'N/A'}
                            </div>
                        </div>
                        <div>
                            <span>Tier {rec.player.analysis?.positionTier || '?'}</span>
                            <small>{getTierDescription(rec.player.analysis?.positionTier || 0)}</small>
                        </div>
                    </div>
                
                    {#if rec.player.analysis}
                    <div class="player-analysis">
                <div class="score-section">
                    <div>
                        <span class={getScoreClass(rec.player.analysis.adjustedScore)}>
                            {rec.player.analysis.adjustedScore.toFixed(1)}
                        </span>
                        <small>Composite Score</small>
                    </div>
                    <div class="multipliers">
                        <span title="Age Impact">🔄 {(rec.player.analysis.ageMultiplier * 100).toFixed(0)}%</span>
                        <span title="Development Potential">📈 {(rec.player.analysis.developmentMultiplier * 100).toFixed(0)}%</span>
                    </div>
                </div>
        
                {#if rec.player.analysis.secondaryPositions?.length}
                <div class="secondary-positions">
                    <h5>Alternative Positions</h5>
                    <div class="positions-grid">
                        {#each rec.player.analysis.secondaryPositions as pos}
                            <div class="alt-position" class:elite={pos.isElite}>
                                <span class="pos-name">{formatPosition(pos.position)}</span>
                                <span class="pos-score">{pos.score.toFixed(1)}</span>
                                {#if pos.isElite}
                                    <span class="elite-badge">Elite</span>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
                {/if}
        
                <div class="fit-scores">
                    <div title="Scheme Fit">
                        <span>🎯 {(rec.player.analysis.schemeFitScore * 100).toFixed(1)}%</span>
                        <small>Scheme Fit</small>
                    </div>
                    <div title="Versatility">
                        <span>🔄 {(rec.player.analysis.versatilityBonus * 100).toFixed(1)}%</span>
                        <small>Versatility</small>
                    </div>
                </div>
            </div>
            {/if}
        
            <div class="draft-projection">
                <div>
                    <span>Round {rec.player.draftData?.round}</span>
                    <span>Pick {rec.player.draftData?.round_pick}</span>
                </div>
                <div class="overall-pick">#{rec.player.draftData?.overall_pick}</div>
            </div>
        
            <div class="recommendation-score">
                <p>{(rec.recommendationScore * 100).toFixed(1)}% Match</p>
                <p class="reason">{rec.reason}</p>
            </div>
        
            <button class="draft-button" on:click={() => draftPlayer(rec)}>
                Draft {rec.player.firstName} {rec.player.lastName}
            </button>
        </div>
    {/each}
</div>
</div>

<div class="roster-status">
    <h3>Roster Status</h3>
    <div class="roster-grid">
        {#each Object.keys(POSITION_GROUPS) as group (group)}
        {@const typedGroup = group as PositionGroup} 
            <div class="position-group">
                <h4>{group}</h4>
                <div class="positions">
                    {#each POSITION_GROUPS[typedGroup] as position}
                        {@const req = rosterRequirements[position as keyof typeof rosterRequirements]}
                        {@const positionPlayers = getDraftedPlayersByPosition()[position] || []}
                        {#if req}
                            <div class="roster-position"
                                class:fulfilled={(currentRosterCounts[position] || 0) >= req.min}
                                class:at-max={(currentRosterCounts[position] || 0) >= req.max}>
                                <span class="position-label">{position}</span>
                                <div class="roster-counts">
                                    <span class="count">
                                        {currentRosterCounts[position] || 0}/{req.max}
                                    </span>
                                    {#if (currentRosterCounts[position] || 0) < req.min}
                                        <span class="warning">
                                            Need {req.min - (currentRosterCounts[position] || 0)} more
                                        </span>
                                    {/if}
                                </div>
                                <div class="drafted-list">
                                    {#if positionPlayers.length}
                                        {#each positionPlayers as dp}
                                            <div class="drafted-player" class:secondary-position={dp.isSecondary}>
                                                <div class="player-name">{dp.player.firstName} {dp.player.lastName}</div>
                                                <div class="player-rating">OVR: {dp.player.ratings[0]?.overallRating}</div>
                                                <div class="player-pick">R{dp.round}P{dp.pick}</div>
                                                {#if dp.isSecondary}
                                                    <div class="secondary-badge" title="Secondary Position Score">
                                                        {dp.secondaryScore?.toFixed(1)}
                                                    </div>
                                                {/if}
                                            </div>
                                        {/each}
                                    {:else}
                                        <div class="empty-position">-</div>
                                    {/if}
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>

    <div class="draft-status-container">
        <button class="undo-button" on:click={undoLastPick}>Undo Last Pick</button>
        {#if draftedPlayers.length === 0}
            <p class="no-players">No players drafted yet</p>
        {/if}
    </div>
{/if}

    {#if error}
        <div class="error">
            Error: {error}
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
    margin: 8px 0;
    color: #666;
    line-height: 1.4;
    }

    .recommendation-card .traits {
        color: #2196F3;
        font-style: italic;
    }

    .viable-positions {
        font-size: 0.9em;
        color: #555;
    }

    .archetype {
        font-weight: 500;
        color: #333;
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

    .requirements-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin: 20px 0;
    }

    .position-group {
        background: #585858;
        padding: 20px;
        border-radius: 8px;
    }

    .positions {
        display: flex;  /* Changed to flex for horizontal layout */
        gap: 15px;
        overflow-x: auto;  /* Allow horizontal scroll if needed */
        padding-bottom: 10px;  /* Space for potential scrollbar */
    }

    .requirement-item {
        background: rgb(77, 77, 77);
        padding: 10px;
        border-radius: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        min-width: 150px;  /* Ensure minimum width */
        flex: 1;  /* Equal width distribution */
    }

    .position-label {
        display: block;
        font-weight: 500;
        margin-bottom: 10px;
        color: white;  /* Changed to white for better contrast */
        text-align: center;
        font-size: 1.1em;
    }

    .requirement-inputs {
        display: flex;
        flex-direction: column;  /* Stack inputs vertically */
        gap: 10px;
    }

    .input-group {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
    }

    .input-group label {
        color: #ccc;  /* Light gray for labels */
        font-size: 0.9em;
    }

    .input-group input {
        width: 60px;
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: rgb(70, 70, 70);
    }

    /* Add horizontal scrollbar styling */
    .positions::-webkit-scrollbar {
        height: 8px;
    }

    .positions::-webkit-scrollbar-track {
        background: #4d4d4d;
        border-radius: 4px;
    }

    .positions::-webkit-scrollbar-thumb {
        background: #666;
        border-radius: 4px;
    }

    .positions::-webkit-scrollbar-thumb:hover {
        background: #777;
    }

    /* Add unit headers styling */
    .position-group h4 {
        color: white;
        margin: 0 0 15px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid #4CAF50;
        font-size: 1.2em;
    }

    .confirm-button {
        background-color: #4CAF50;
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1.1em;
    }

    .confirm-button:hover {
        background-color: #45a049;
    }

    .fulfilled {
        background: #4CAF50;
    }

    .at-max {
        background: #ff9800;
    }

        /* Update roster status styles */
        .roster-status {
        margin: 20px 0;
    }

    .roster-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .roster-position {
        background: rgb(77, 77, 77);
        padding: 15px;
        border-radius: 6px;
        min-width: 120px;
        max-width: 150px;
        flex: 1;
    }

    .roster-counts {
        display: flex;
        flex-direction: column;
        gap: 5px;
        color: #ccc;
        font-size: 0.9em;
        text-align: center;
    }

    .roster-position.fulfilled {
        background: #4CAF50;
    }

    .roster-position.at-max {
        background: #ff9800;
    }

    .roster-position.fulfilled .roster-counts,
    .roster-position.at-max .roster-counts {
        color: white;
    }

    .roster-position .count {
        font-weight: 500;
        font-size: 1.1em;
    }

    .drafted-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 10px;
    }

    .drafted-player {
        background: rgb(90, 90, 90);
        padding: 8px;
        border-radius: 4px;
        font-size: 0.85em;
    }

    .player-name {
        color: white;
        font-weight: 500;
        margin-bottom: 2px;
    }

    .player-rating {
        color: #ccc;
        font-size: 0.9em;
    }

    .player-pick {
        color: #aaa;
        font-size: 0.8em;
    }

    .empty-position {
        color: #999;
        text-align: center;
        padding: 8px;
    }
</style>