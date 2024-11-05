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

    interface RosterNeed {
        position: string;
        needed: number;
        maximum: number;
    }

    type UnitName = 'Offense' | 'Defense' | 'Special Teams';
    type PositionGroups = Record<UnitName, string[]>;

    const POSITION_GROUPS: PositionGroups = {
        'Offense': ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'],
        'Defense': ['LE', 'DT', 'RE', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS'],
        'Special Teams': ['K', 'P']
    } as const;

    const DEFAULT_REQUIREMENTS: RosterRequirement[] = [
        // Offense
        { position: 'QB', minimumPlayers: 2, maximumPlayers: 4, positionGroup: 'Offense', isRequired: true },
        { position: 'HB', minimumPlayers: 3, maximumPlayers: 5, positionGroup: 'Offense', isRequired: true },
        { position: 'FB', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Offense', isRequired: true },
        { position: 'WR', minimumPlayers: 5, maximumPlayers: 7, positionGroup: 'Offense', isRequired: true },
        { position: 'TE', minimumPlayers: 2, maximumPlayers: 4, positionGroup: 'Offense', isRequired: true },
        { position: 'LT', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Offense', isRequired: true },
        { position: 'LG', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Offense', isRequired: true },
        { position: 'C', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Offense', isRequired: true },
        { position: 'RG', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Offense', isRequired: true },
        { position: 'RT', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Offense', isRequired: true },
        
        // Defense
        { position: 'LE', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Defense', isRequired: true },
        { position: 'DT', minimumPlayers: 2, maximumPlayers: 4, positionGroup: 'Defense', isRequired: true },
        { position: 'RE', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Defense', isRequired: true },
        { position: 'LOLB', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Defense', isRequired: true },
        { position: 'MLB', minimumPlayers: 2, maximumPlayers: 3, positionGroup: 'Defense', isRequired: true },
        { position: 'ROLB', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Defense', isRequired: true },
        { position: 'CB', minimumPlayers: 4, maximumPlayers: 6, positionGroup: 'Defense', isRequired: true },
        { position: 'FS', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Defense', isRequired: true },
        { position: 'SS', minimumPlayers: 1, maximumPlayers: 2, positionGroup: 'Defense', isRequired: true },
        
        // Special Teams
        { position: 'K', minimumPlayers: 1, maximumPlayers: 1, positionGroup: 'Special Teams', isRequired: true },
        { position: 'P', minimumPlayers: 1, maximumPlayers: 1, positionGroup: 'Special Teams', isRequired: true }
    ];

    // Store recommendations
    // Store recommendations
    let recommendations: Recommendation[] = [];
    let isSettingRequirements = true;  // New state to control setup phase
    let editableRequirements = DEFAULT_REQUIREMENTS;  // Editable copy of requirements
    let rosterRequirements: RosterRequirement[] = [];
    let rosterNeeds: Record<string, RosterNeed> = {};
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
                        rosterNeeds: JSON.stringify(rosterNeeds)
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
            // If backend requirements exist, use those instead of defaults
            if (result.data.rosterRequirements?.length > 0) {
                editableRequirements = result.data.rosterRequirements;
            }
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load roster requirements';
            // On error, fall back to default requirements
            editableRequirements = DEFAULT_REQUIREMENTS;
        }
    });

    onMount(async () => {
        try {
            const result = await client.query({
                query: GET_ROSTER_REQUIREMENTS
            });
            rosterRequirements = result.data.rosterRequirements;
            
            // Initialize roster needs from requirements
            rosterNeeds = rosterRequirements.reduce((acc, req) => {
                acc[req.position] = {
                    position: req.position,
                    needed: req.minimumPlayers,
                    maximum: req.maximumPlayers
                };
                return acc;
            }, {} as Record<string, RosterNeed>);
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
            const position = recommendation.player.ratings[0]?.position?.code || 'Unknown';
            
            // Update roster needs
            if (rosterNeeds[position]) {
                rosterNeeds[position].needed = Math.max(0, rosterNeeds[position].needed - 1);
            }

            // Create draft pick in backend
            const result = await client.mutate({
                mutation: CREATE_DRAFT_PICK,
                variables: {
                    input: {
                        sessionId,
                        playerId: recommendation.player.id,
                        roundNumber: currentRound,
                        pickNumber: currentPick,
                        draftedPosition: position
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

    // Add function to check if position is at maximum
    function isPositionAtMaximum(position: string): boolean {
        const count = currentRosterCounts[position] || 0;
        return count >= (rosterNeeds[position]?.maximum || 0);
    }

    function confirmRequirements() {
        rosterRequirements = editableRequirements;
        // Initialize roster needs from confirmed requirements
        rosterNeeds = rosterRequirements.reduce((acc, req) => {
            acc[req.position] = {
                position: req.position,
                needed: req.minimumPlayers,
                maximum: req.maximumPlayers
            };
            return acc;
        }, {} as Record<string, RosterNeed>);
        isSettingRequirements = false;
    }

    function updateRequirement(position: string, field: 'minimumPlayers' | 'maximumPlayers', value: number) {
        editableRequirements = editableRequirements.map(req => 
            req.position === position 
                ? { ...req, [field]: Math.max(0, value) }
                : req
        );
    }
    
</script>

<div class="draft-recommender">
    <h2>Draft Recommender</h2>
    
    {#if isSettingRequirements}
    <div class="requirements-setup">
        <h3>Set Roster Requirements</h3>
        <div class="requirements-grid">
            <!-- Offense -->
            <div class="position-group">
                <h4>Offense</h4>
                <div class="positions">
                    {#each POSITION_GROUPS['Offense'] as position}
                        {@const requirement = editableRequirements.find(r => r.position === position)}
                        {#if requirement}
                            <div class="requirement-item">
                                <span class="position-label">{position}</span>
                                <div class="requirement-inputs">
                                    <div class="input-group">
                                        <label for="{position}-min">Minimum:</label>
                                        <input 
                                            type="number" 
                                            id="{position}-min"
                                            min="0"
                                            value={requirement.minimumPlayers}
                                            on:input={(e) => updateRequirement(position, 'minimumPlayers', parseInt(e.currentTarget.value))}
                                        />
                                    </div>
                                    <div class="input-group">
                                        <label for="{position}-max">Maximum:</label>
                                        <input 
                                            type="number"
                                            id="{position}-max"
                                            min="0"
                                            value={requirement.maximumPlayers}
                                            on:input={(e) => updateRequirement(position, 'maximumPlayers', parseInt(e.currentTarget.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
    
            <!-- Defense -->
            <div class="position-group">
                <h4>Defense</h4>
                <div class="positions">
                    {#each POSITION_GROUPS['Defense'] as position}
                        {@const requirement = editableRequirements.find(r => r.position === position)}
                        {#if requirement}
                            <div class="requirement-item">
                                <span class="position-label">{position}</span>
                                <div class="requirement-inputs">
                                    <div class="input-group">
                                        <label for="{position}-min">Minimum:</label>
                                        <input 
                                            type="number" 
                                            id="{position}-min"
                                            min="0"
                                            value={requirement.minimumPlayers}
                                            on:input={(e) => updateRequirement(position, 'minimumPlayers', parseInt(e.currentTarget.value))}
                                        />
                                    </div>
                                    <div class="input-group">
                                        <label for="{position}-max">Maximum:</label>
                                        <input 
                                            type="number"
                                            id="{position}-max"
                                            min="0"
                                            value={requirement.maximumPlayers}
                                            on:input={(e) => updateRequirement(position, 'maximumPlayers', parseInt(e.currentTarget.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
    
            <!-- Special Teams -->
            <div class="position-group">
                <h4>Special Teams</h4>
                <div class="positions">
                    {#each POSITION_GROUPS['Special Teams'] as position}
                        {@const requirement = editableRequirements.find(r => r.position === position)}
                        {#if requirement}
                            <div class="requirement-item">
                                <span class="position-label">{position}</span>
                                <div class="requirement-inputs">
                                    <div class="input-group">
                                        <label for="{position}-min">Minimum:</label>
                                        <input 
                                            type="number" 
                                            id="{position}-min"
                                            min="0"
                                            value={requirement.minimumPlayers}
                                            on:input={(e) => updateRequirement(position, 'minimumPlayers', parseInt(e.currentTarget.value))}
                                        />
                                    </div>
                                    <div class="input-group">
                                        <label for="{position}-max">Maximum:</label>
                                        <input 
                                            type="number"
                                            id="{position}-max"
                                            min="0"
                                            value={requirement.maximumPlayers}
                                            on:input={(e) => updateRequirement(position, 'maximumPlayers', parseInt(e.currentTarget.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        </div>
        <button class="confirm-button" on:click={confirmRequirements}>
            Confirm Requirements & Continue
        </button>
    </div>
    {:else}
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
    {/if}

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

                <!-- Move recommendations here -->
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

        <div class="roster-status">
            <h3>Current Roster</h3>
            <div class="roster-grid">
                <!-- Offense -->
                <div class="position-group">
                    <h4>Offense</h4>
                    <div class="positions">
                        {#each POSITION_GROUPS['Offense'] as position}
                            {@const req = rosterRequirements.find(r => r.position === position)}
                            {#if req}
                                <div class="roster-position" 
                                     class:fulfilled={(currentRosterCounts[position] || 0) >= req.minimumPlayers}
                                     class:at-max={(currentRosterCounts[position] || 0) >= req.maximumPlayers}>
                                    <span class="position-label">{position}</span>
                                    <div class="roster-counts">
                                        <span class="count">
                                            {currentRosterCounts[position] || 0}/{req.maximumPlayers}
                                        </span>
                                        {#if (currentRosterCounts[position] || 0) < req.minimumPlayers}
                                            <span class="warning">
                                                Need {req.minimumPlayers - (currentRosterCounts[position] || 0)} more
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        {/each}
                    </div>
                </div>
        
                <!-- Defense -->
                <div class="position-group">
                    <h4>Defense</h4>
                    <div class="positions">
                        {#each POSITION_GROUPS['Defense'] as position}
                            {@const req = rosterRequirements.find(r => r.position === position)}
                            {#if req}
                                <div class="roster-position"
                                     class:fulfilled={(currentRosterCounts[position] || 0) >= req.minimumPlayers}
                                     class:at-max={(currentRosterCounts[position] || 0) >= req.maximumPlayers}>
                                    <span class="position-label">{position}</span>
                                    <div class="roster-counts">
                                        <span class="count">
                                            {currentRosterCounts[position] || 0}/{req.maximumPlayers}
                                        </span>
                                        {#if (currentRosterCounts[position] || 0) < req.minimumPlayers}
                                            <span class="warning">
                                                Need {req.minimumPlayers - (currentRosterCounts[position] || 0)} more
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        {/each}
                    </div>
                </div>
        
                <!-- Special Teams -->
                <div class="position-group">
                    <h4>Special Teams</h4>
                    <div class="positions">
                        {#each POSITION_GROUPS['Special Teams'] as position}
                            {@const req = rosterRequirements.find(r => r.position === position)}
                            {#if req}
                                <div class="roster-position"
                                     class:fulfilled={(currentRosterCounts[position] || 0) >= req.minimumPlayers}
                                     class:at-max={(currentRosterCounts[position] || 0) >= req.maximumPlayers}>
                                    <span class="position-label">{position}</span>
                                    <div class="roster-counts">
                                        <span class="count">
                                            {currentRosterCounts[position] || 0}/{req.maximumPlayers}
                                        </span>
                                        {#if (currentRosterCounts[position] || 0) < req.minimumPlayers}
                                            <span class="warning">
                                                Need {req.minimumPlayers - (currentRosterCounts[position] || 0)} more
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        {/each}
                    </div>
                </div>
            </div>
        </div>

        <div class="draft-status-container">
            <div class="drafted-players">
                <h3>Drafted Players</h3>
                {#if draftedPlayers.length > 0}
                    <div class="needs-grid">
                        <!-- Offense -->
                        <div class="position-group">
                            <h4>Offense</h4>
                            <div class="positions">
                                {#each POSITION_GROUPS['Offense'] as position}
                                    <div class="drafted-position">
                                        <span class="position-label">{position}</span>
                                        <div class="drafted-list">
                                            {#if getDraftedPlayersByGroup()['Offense']?.[position]?.length}
                                                {#each getDraftedPlayersByGroup()['Offense'][position] as dp}
                                                    <div class="drafted-player">
                                                        <div class="player-name">{dp.player.firstName} {dp.player.lastName}</div>
                                                        <div class="player-rating">OVR: {dp.player.ratings[0]?.overallRating}</div>
                                                        <div class="player-pick">R{dp.round}P{dp.pick}</div>
                                                    </div>
                                                {/each}
                                            {:else}
                                                <div class="empty-position">-</div>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
        
                        <!-- Defense -->
                        <div class="position-group">
                            <h4>Defense</h4>
                            <div class="positions">
                                {#each POSITION_GROUPS['Defense'] as position}
                                    <div class="drafted-position">
                                        <span class="position-label">{position}</span>
                                        <div class="drafted-list">
                                            {#if getDraftedPlayersByGroup()['Defense']?.[position]?.length}
                                                {#each getDraftedPlayersByGroup()['Defense'][position] as dp}
                                                    <div class="drafted-player">
                                                        <div class="player-name">{dp.player.firstName} {dp.player.lastName}</div>
                                                        <div class="player-rating">OVR: {dp.player.ratings[0]?.overallRating}</div>
                                                        <div class="player-pick">R{dp.round}P{dp.pick}</div>
                                                    </div>
                                                {/each}
                                            {:else}
                                                <div class="empty-position">-</div>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
        
                        <!-- Special Teams -->
                        <div class="position-group">
                            <h4>Special Teams</h4>
                            <div class="positions">
                                {#each POSITION_GROUPS['Special Teams'] as position}
                                    <div class="drafted-position">
                                        <span class="position-label">{position}</span>
                                        <div class="drafted-list">
                                            {#if getDraftedPlayersByGroup()['Special Teams']?.[position]?.length}
                                                {#each getDraftedPlayersByGroup()['Special Teams'][position] as dp}
                                                    <div class="drafted-player">
                                                        <div class="player-name">{dp.player.firstName} {dp.player.lastName}</div>
                                                        <div class="player-rating">OVR: {dp.player.ratings[0]?.overallRating}</div>
                                                        <div class="player-pick">R{dp.round}P{dp.pick}</div>
                                                    </div>
                                                {/each}
                                            {:else}
                                                <div class="empty-position">-</div>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
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

    .needs-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .need-item {
        background: rgb(77, 77, 77);
        padding: 15px;
        border-radius: 6px;
        min-width: 120px;
        max-width: 150px;
        flex: 1;
    }

    .need-counts {
        display: flex;
        flex-direction: column;
        gap: 5px;
        color: #ccc;
        font-size: 0.9em;
        text-align: center;
    }

    .fulfilled {
        background: #4CAF50;
    }

    .at-max {
        background: #ff9800;
    }

    .fulfilled .need-counts,
    .at-max .need-counts {
        color: white;
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

        /* Add these new styles */
        .drafted-position {
        background: rgb(77, 77, 77);
        padding: 15px;
        border-radius: 6px;
        min-width: 120px;
        max-width: 150px;
        flex: 1;
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

    /* Update existing styles if needed */
    .drafted-players {
        margin: 20px 0;
    }
</style>