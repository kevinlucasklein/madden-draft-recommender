<script lang="ts">
    import { client } from '../apollo/client';
    import { GENERATE_RECOMMENDATIONS } from './graphql/queries/draftRecommendations';
    import { CREATE_DRAFT_SESSION } from './graphql/queries/createDraftSession';
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

    // Store recommendations
    // Store recommendations
    let recommendations: Recommendation[] = [];

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
        <div class="draft-navigation">
            <button on:click={previousPick} disabled={currentRound === 1}>
                Previous Pick
            </button>
            <span>Round {currentRound}, Pick {currentPick} {#if isSnakeDraft}(Snake Draft){/if}</span>
            <button on:click={nextPick} disabled={currentRound >= 54}>
                Next Pick
            </button>
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
                </div>
            {/each}
        </div>
    </div>
{/if}
</div>

<style>
    .draft-recommender {
        max-width: 1200px;
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
</style>