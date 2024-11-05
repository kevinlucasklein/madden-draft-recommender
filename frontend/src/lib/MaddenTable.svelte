<script lang="ts">
    import { onMount } from 'svelte';
    import { client } from '../apollo/client';
    import { GET_ALL_PLAYERS } from '../lib/graphql/queries/players';

    // Update interface to match GraphQL schema
    interface PlayerData {
        id: number;
        firstName: string;
        lastName: string;
        height: string;
        weight: number;
        college: string;
        handedness: string;
        age: number;
        jerseyNumber: number;
        yearsPro: number;
        position: {
            name: string;        // Changed from name
            type: string;  // Changed from type
        };
        team: {
            label: string;
        };
        archetype: {
            name: string;      // Changed from name
        };
        abilities: Array<{
            name: string;  // Changed from name
            abilityOrder: number;  // Added this
        }>;
        ratings: Array<{       // Changed to array
            overall: number;  // Changed from overall
        }>;
        stats: Array<{
            speed: number;
            acceleration: number;
            agility: number;
            jumping: number;
            stamina: number;
            strength: number;
            awareness: number;
            bcvision: number;
            blockShedding: number;
            breakSack: number;
            breakTackle: number;
            carrying: number;
            catchInTraffic: number;
            catching: number;
            changeOfDirection: number;
            deepRouteRunning: number;
            finesseMoves: number;
            hitPower: number;
            impactBlocking: number;
            injury: number;
            jukeMove: number;
            kickAccuracy: number;
            kickPower: number;
            kickReturn: number;
            leadBlock: number;
            manCoverage: number;
            mediumRouteRunning: number;
            passBlock: number;
            passBlockFinesse: number;
            passBlockPower: number;
            playAction: number;
            playRecognition: number;
            powerMoves: number;
            press: number;
            pursuit: number;
            release: number;
            runBlock: number;
            runBlockFinesse: number;
            runBlockPower: number;
            runningStyle: string;
            shortRouteRunning: number;
            spectacularCatch: number;
            spinMove: number;
            stiffArm: number;
            tackle: number;
            throwAccuracyDeep: number;
            throwAccuracyMid: number;
            throwAccuracyShort: number;
            throwOnTheRun: number;
            throwPower: number;
            throwUnderPressure: number;
            toughness: number;
            trucking: number;
            zoneCoverage: number;
        }>;
        draftData?: {
            overall_pick: number;
            round: number;
            round_pick: number;
        };
    }

    let players: PlayerData[] = [];
    let loading = true;
    let error: string | null = null;
    let tableContainer: HTMLElement;
    let scrollbarContainer: HTMLElement;

    // Update sorting state to handle nested properties
    let sortColumn: string = 'ratings.overall';
    let sortDirection: 'asc' | 'desc' = 'desc';

    function sortPlayers(column: string) {
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = column;
            sortDirection = 'desc';  // Default to descending for new sorts
        }

        players = [...players].sort((a, b) => {
            let aVal, bVal;

            // Handle special case for overall rating
            if (column.startsWith('draftData.')) {
                const draftProperty = column.split('.')[1] as keyof PlayerData['draftData'];
                aVal = a.draftData?.[draftProperty] ?? 0;
                bVal = b.draftData?.[draftProperty] ?? 0;
            }else if (column === 'ratings.overall') {
                aVal = a.ratings?.[0]?.overall ?? 0;
                bVal = b.ratings?.[0]?.overall ?? 0;
            } else if (column.startsWith('stats.')) {
                // Handle stats properties
                const statProperty = column.split('.')[1] as keyof PlayerData['stats'][0];
                aVal = a.stats?.[0]?.[statProperty] ?? 0;
                bVal = b.stats?.[0]?.[statProperty] ?? 0;
            } else {
                // Handle regular properties
                aVal = a[column as keyof PlayerData];
                bVal = b[column as keyof PlayerData];
            }

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'desc' ? aVal - bVal : bVal - aVal;
            }

            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            return sortDirection === 'desc' 
                ? aStr.localeCompare(bStr)
                : bStr.localeCompare(aStr);
        });
    }

    // In your onMount, initialize with overall sort
    onMount(async () => {
        try {
            const { data } = await client.query({
                query: GET_ALL_PLAYERS
            });
            players = [...data.players];
            sortColumn = 'ratings.overall';
            sortDirection = 'desc';  // Highest to lowest
            sortPlayers('ratings.overall');
        } catch (e) {
            error = e instanceof Error ? e.message : 'An error occurred';
        } finally {
            loading = false;
        }
    });

    onMount(() => {
        const tableWrapper = document.querySelector('.table-wrapper') as HTMLElement;
        tableContainer = tableWrapper.querySelector('.table-container') as HTMLElement;
        scrollbarContainer = tableWrapper.querySelector('.scrollbar-container') as HTMLElement;
        const scrollbarContent = scrollbarContainer.querySelector('.scrollbar-content') as HTMLElement;

        // Sync the scrollbar content width with the table width
        const observer = new ResizeObserver(() => {
            if (tableContainer.firstElementChild) {
                scrollbarContent.style.width = `${tableContainer.firstElementChild.scrollWidth}px`;
            }
        });
        
        if (tableContainer.firstElementChild) {
            observer.observe(tableContainer.firstElementChild);
        }

        // Sync scroll positions
        tableContainer.addEventListener('scroll', () => {
            scrollbarContainer.scrollLeft = tableContainer.scrollLeft;
        });

        scrollbarContainer.addEventListener('scroll', () => {
            tableContainer.scrollLeft = scrollbarContainer.scrollLeft;
        });

        return () => {
            if (tableContainer.firstElementChild) {
                observer.unobserve(tableContainer.firstElementChild);
            }
        };
    });
    onMount(() => {
        const firstCol = document.querySelector('th:first-child');
        const secondCol = document.querySelector('th:nth-child(2)');
        if (firstCol && secondCol) {
            document.documentElement.style.setProperty('--first-col-width', `${(firstCol as HTMLElement).offsetWidth}px`);
            document.documentElement.style.setProperty('--second-col-width', `${(firstCol as HTMLElement).offsetWidth + (secondCol as HTMLElement).offsetWidth}px`);
        }
    });

</script>
  
<div class="table-wrapper">
    <div class="table-container">
        {#if loading}
            <p>Loading player data...</p>
        {:else if error}
            <p class="error">Error: {error}</p>
        {:else}
            <table>
                <thead>
                    <tr>
                        <!-- Base Info -->
                        <th on:click={() => sortPlayers('ratings.overall')} 
                            class:sorted={sortColumn === 'ratings.overall'} 
                            class:asc={sortDirection === 'desc'}>
                            Overall {sortColumn === 'ratings.overall' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('firstName')} 
                            class:sorted={sortColumn === 'firstName'} 
                            class:asc={sortDirection === 'asc'}>
                            First Name {sortColumn === 'firstName' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('lastName')} 
                            class:sorted={sortColumn === 'lastName'} 
                            class:asc={sortDirection === 'asc'}>
                            Last Name {sortColumn === 'lastName' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('height')} 
                            class:sorted={sortColumn === 'height'} 
                            class:asc={sortDirection === 'asc'}>
                            Height {sortColumn === 'height' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('weight')} 
                            class:sorted={sortColumn === 'weight'} 
                            class:asc={sortDirection === 'asc'}>
                            Weight {sortColumn === 'weight' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('college')} 
                            class:sorted={sortColumn === 'college'} 
                            class:asc={sortDirection === 'asc'}>
                            College {sortColumn === 'college' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('handedness')} 
                            class:sorted={sortColumn === 'handedness'} 
                            class:asc={sortDirection === 'asc'}>
                            Handedness {sortColumn === 'handedness' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('age')} 
                            class:sorted={sortColumn === 'age'} 
                            class:asc={sortDirection === 'asc'}>
                            Age {sortColumn === 'age' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('jerseyNumber')} 
                            class:sorted={sortColumn === 'jerseyNumber'} 
                            class:asc={sortDirection === 'asc'}>
                            Jersey # {sortColumn === 'jerseyNumber' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('yearsPro')} 
                            class:sorted={sortColumn === 'yearsPro'} 
                            class:asc={sortDirection === 'asc'}>
                            Years Pro {sortColumn === 'yearsPro' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('position')} 
                            class:sorted={sortColumn === 'position'} 
                            class:asc={sortDirection === 'asc'}>
                            Position {sortColumn === 'position' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('positionType')} 
                            class:sorted={sortColumn === 'positionType'} 
                            class:asc={sortDirection === 'asc'}>
                            Position Type {sortColumn === 'positionType' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('teamLabel')} 
                            class:sorted={sortColumn === 'teamLabel'} 
                            class:asc={sortDirection === 'asc'}>
                            Team {sortColumn === 'teamLabel' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('archetypeLabel')} 
                            class:sorted={sortColumn === 'archetypeLabel'} 
                            class:asc={sortDirection === 'asc'}>
                            Archetype {sortColumn === 'archetypeLabel' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('ability1')} 
                            class:sorted={sortColumn === 'ability1'} 
                            class:asc={sortDirection === 'asc'}>
                            Ability 1 {sortColumn === 'ability1' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('ability2')} 
                            class:sorted={sortColumn === 'ability2'} 
                            class:asc={sortDirection === 'asc'}>
                            Ability 2 {sortColumn === 'ability2' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('ability3')} 
                            class:sorted={sortColumn === 'ability3'} 
                            class:asc={sortDirection === 'asc'}>
                            Ability 3 {sortColumn === 'ability3' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('ability4')} 
                            class:sorted={sortColumn === 'ability4'} 
                            class:asc={sortDirection === 'asc'}>
                            Ability 4 {sortColumn === 'ability4' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('ability5')} 
                            class:sorted={sortColumn === 'ability5'} 
                            class:asc={sortDirection === 'asc'}>
                            Ability 5 {sortColumn === 'ability5' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('ability6')} 
                            class:sorted={sortColumn === 'ability6'} 
                            class:asc={sortDirection === 'asc'}>
                            Ability 6 {sortColumn === 'ability6' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('speed')}
                            class:sorted={sortColumn === 'speed'} 
                            class:asc={sortDirection === 'asc'}>
                            Speed {sortColumn === 'speed' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('acceleration')}
                            class:sorted={sortColumn === 'acceleration'} 
                            class:asc={sortDirection === 'asc'}>
                            Acceleration {sortColumn === 'acceleration' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('agility')}
                            class:sorted={sortColumn === 'agility'} 
                            class:asc={sortDirection === 'asc'}>
                            Agility {sortColumn === 'agility' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('jumping')}
                            class:sorted={sortColumn === 'jumping'} 
                            class:asc={sortDirection === 'asc'}>
                            Jumping {sortColumn === 'jumping' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('stamina')}
                            class:sorted={sortColumn === 'stamina'} 
                            class:asc={sortDirection === 'asc'}>
                            Stamina {sortColumn === 'stamina' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('strength')}
                            class:sorted={sortColumn === 'strength'} 
                            class:asc={sortDirection === 'asc'}>
                            Strength {sortColumn === 'strength' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('changeOfDirection')}
                            class:sorted={sortColumn === 'changeOfDirection'} 
                            class:asc={sortDirection === 'asc'}>
                            Change of Direction {sortColumn === 'changeOfDirection' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('awareness')}
                            class:sorted={sortColumn === 'awareness'} 
                            class:asc={sortDirection === 'asc'}>
                            Awareness {sortColumn === 'awareness' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('playRecognition')}
                            class:sorted={sortColumn === 'playRecognition'} 
                            class:asc={sortDirection === 'asc'}>
                            Play Recognition {sortColumn === 'playRecognition' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('toughness')}
                            class:sorted={sortColumn === 'toughness'} 
                            class:asc={sortDirection === 'asc'}>
                            Toughness {sortColumn === 'toughness' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('bcvision')}
                            class:sorted={sortColumn === 'bcvision'} 
                            class:asc={sortDirection === 'asc'}>
                            BC Vision {sortColumn === 'bcvision' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('carrying')}
                            class:sorted={sortColumn === 'carrying'} 
                            class:asc={sortDirection === 'asc'}>
                            Carrying {sortColumn === 'carrying' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('breakTackle')}
                            class:sorted={sortColumn === 'breakTackle'} 
                            class:asc={sortDirection === 'asc'}>
                            Break Tackle {sortColumn === 'breakTackle' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('breakSack')}
                            class:sorted={sortColumn === 'breakSack'} 
                            class:asc={sortDirection === 'asc'}>
                            Break Sack {sortColumn === 'breakSack' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('trucking')}
                            class:sorted={sortColumn === 'trucking'} 
                            class:asc={sortDirection === 'asc'}>
                            Trucking {sortColumn === 'trucking' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('stiffArm')}
                            class:sorted={sortColumn === 'stiffArm'} 
                            class:asc={sortDirection === 'asc'}>
                            Stiff Arm {sortColumn === 'stiffArm' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('spinMove')}
                            class:sorted={sortColumn === 'spinMove'} 
                            class:asc={sortDirection === 'asc'}>
                            Spin Move {sortColumn === 'spinMove' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('jukeMove')}
                            class:sorted={sortColumn === 'jukeMove'} 
                            class:asc={sortDirection === 'asc'}>
                            Juke Move {sortColumn === 'jukeMove' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('catching')}
                            class:sorted={sortColumn === 'catching'} 
                            class:asc={sortDirection === 'asc'}>
                            Catching {sortColumn === 'catching' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('catchInTraffic')}
                            class:sorted={sortColumn === 'catchInTraffic'} 
                            class:asc={sortDirection === 'asc'}>
                            Catch In Traffic {sortColumn === 'catchInTraffic' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('spectacularCatch')}
                            class:sorted={sortColumn === 'spectacularCatch'} 
                            class:asc={sortDirection === 'asc'}>
                            Spectacular Catch {sortColumn === 'spectacularCatch' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('shortRouteRunning')}
                            class:sorted={sortColumn === 'shortRouteRunning'} 
                            class:asc={sortDirection === 'asc'}>
                            Short Route Running {sortColumn === 'shortRouteRunning' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('mediumRouteRunning')}
                            class:sorted={sortColumn === 'mediumRouteRunning'} 
                            class:asc={sortDirection === 'asc'}>
                            Medium Route Running {sortColumn === 'mediumRouteRunning' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('deepRouteRunning')}
                            class:sorted={sortColumn === 'deepRouteRunning'} 
                            class:asc={sortDirection === 'asc'}>
                            Deep Route Running {sortColumn === 'deepRouteRunning' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('release')}
                            class:sorted={sortColumn === 'release'} 
                            class:asc={sortDirection === 'asc'}>
                            Release {sortColumn === 'release' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('throwPower')}
                            class:sorted={sortColumn === 'throwPower'} 
                            class:asc={sortDirection === 'asc'}>
                            Throw Power {sortColumn === 'throwPower' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('throwAccuracyShort')}
                            class:sorted={sortColumn === 'throwAccuracyShort'} 
                            class:asc={sortDirection === 'asc'}>
                            Throw Accuracy Short {sortColumn === 'throwAccuracyShort' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('throwAccuracyMid')}
                            class:sorted={sortColumn === 'throwAccuracyMid'} 
                            class:asc={sortDirection === 'asc'}>
                            Throw Accuracy Mid {sortColumn === 'throwAccuracyMid' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('throwAccuracyDeep')}
                            class:sorted={sortColumn === 'throwAccuracyDeep'} 
                            class:asc={sortDirection === 'asc'}>
                            Throw Accuracy Deep {sortColumn === 'throwAccuracyDeep' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('throwOnTheRun')}
                            class:sorted={sortColumn === 'throwOnTheRun'} 
                            class:asc={sortDirection === 'asc'}>
                            Throw On The Run {sortColumn === 'throwOnTheRun' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('throwUnderPressure')}
                            class:sorted={sortColumn === 'throwUnderPressure'} 
                            class:asc={sortDirection === 'asc'}>
                            Throw Under Pressure {sortColumn === 'throwUnderPressure' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('playAction')}
                            class:sorted={sortColumn === 'playAction'} 
                            class:asc={sortDirection === 'asc'}>
                            Play Action {sortColumn === 'playAction' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('passBlock')}
                            class:sorted={sortColumn === 'passBlock'} 
                            class:asc={sortDirection === 'asc'}>
                            Pass Block {sortColumn === 'passBlock' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('passBlockPower')}
                            class:sorted={sortColumn === 'passBlockPower'} 
                            class:asc={sortDirection === 'asc'}>
                            Pass Block Power {sortColumn === 'passBlockPower' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('passBlockFinesse')}
                            class:sorted={sortColumn === 'passBlockFinesse'} 
                            class:asc={sortDirection === 'asc'}>
                            Pass Block Finesse {sortColumn === 'passBlockFinesse' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('runBlock')}
                            class:sorted={sortColumn === 'runBlock'} 
                            class:asc={sortDirection === 'asc'}>
                            Run Block {sortColumn === 'runBlock' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('runBlockPower')}
                            class:sorted={sortColumn === 'runBlockPower'} 
                            class:asc={sortDirection === 'asc'}>
                            Run Block Power {sortColumn === 'runBlockPower' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('runBlockFinesse')}
                            class:sorted={sortColumn === 'runBlockFinesse'} 
                            class:asc={sortDirection === 'asc'}>
                            Run Block Finesse {sortColumn === 'runBlockFinesse' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>   
                        <th on:click={() => sortPlayers('impactBlocking')}
                            class:sorted={sortColumn === 'impactBlocking'} 
                            class:asc={sortDirection === 'asc'}>
                            Impact Blocking {sortColumn === 'impactBlocking' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('leadBlock')}
                            class:sorted={sortColumn === 'leadBlock'} 
                            class:asc={sortDirection === 'asc'}>
                            Lead Block {sortColumn === 'leadBlock' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('tackle')}
                            class:sorted={sortColumn === 'tackle'} 
                            class:asc={sortDirection === 'asc'}>
                            Tackle {sortColumn === 'tackle' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('hitPower')}
                            class:sorted={sortColumn === 'hitPower'} 
                            class:asc={sortDirection === 'asc'}>
                            Hit Power {sortColumn === 'hitPower' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('powerMoves')}
                            class:sorted={sortColumn === 'powerMoves'} 
                            class:asc={sortDirection === 'asc'}>
                            Power Moves {sortColumn === 'powerMoves' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('finesseMoves')}
                            class:sorted={sortColumn === 'finesseMoves'} 
                            class:asc={sortDirection === 'asc'}>
                            Finesse Moves {sortColumn === 'finesseMoves' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('blockShedding')}
                            class:sorted={sortColumn === 'blockShedding'} 
                            class:asc={sortDirection === 'asc'}>
                            Block Shedding {sortColumn === 'blockShedding' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('pursuit')}
                            class:sorted={sortColumn === 'pursuit'} 
                            class:asc={sortDirection === 'asc'}>
                            Pursuit {sortColumn === 'pursuit' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('manCoverage')}
                            class:sorted={sortColumn === 'manCoverage'} 
                            class:asc={sortDirection === 'asc'}>
                            Man Coverage {sortColumn === 'manCoverage' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('zoneCoverage')}
                            class:sorted={sortColumn === 'zoneCoverage'} 
                            class:asc={sortDirection === 'asc'}>
                            Zone Coverage {sortColumn === 'zoneCoverage' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('press')}
                            class:sorted={sortColumn === 'press'} 
                            class:asc={sortDirection === 'asc'}>
                            Press {sortColumn === 'press' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('kickPower')}
                            class:sorted={sortColumn === 'kickPower'} 
                            class:asc={sortDirection === 'asc'}>
                            Kick Power {sortColumn === 'kickPower' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('kickAccuracy')}
                            class:sorted={sortColumn === 'kickAccuracy'} 
                            class:asc={sortDirection === 'asc'}>
                            Kick Accuracy {sortColumn === 'kickAccuracy' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('kickReturn')}
                            class:sorted={sortColumn === 'kickReturn'} 
                            class:asc={sortDirection === 'asc'}>
                            Kick Return {sortColumn === 'kickReturn' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('injury')}
                            class:sorted={sortColumn === 'injury'} 
                            class:asc={sortDirection === 'asc'}>
                            Injury {sortColumn === 'injury' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('runningStyle')}
                            class:sorted={sortColumn === 'runningStyle'} 
                            class:asc={sortDirection === 'asc'}>
                            Running Style {sortColumn === 'runningStyle' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('draftData.overall_pick')} 
                            class:sorted={sortColumn === 'draftData.overall_pick'} 
                            class:asc={sortDirection === 'asc'}>
                            Overall Pick {sortColumn === 'draftData.overall_pick' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('draftData.round')} 
                            class:sorted={sortColumn === 'draftData.round'} 
                            class:asc={sortDirection === 'asc'}>
                            Round {sortColumn === 'draftData.round' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th on:click={() => sortPlayers('draftData.round_pick')} 
                            class:sorted={sortColumn === 'draftData.round_pick'} 
                            class:asc={sortDirection === 'asc'}>
                            Round Pick {sortColumn === 'draftData.round_pick' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                    </tr>
                </thead>

            <tbody>
                {#each players as player}
                    <tr>
                        <!-- Ratings -->
                        <td>{player.ratings?.[0]?.overall}</td>  <!-- Using .overall instead of .overallRating -->
                        <!-- Basic Info -->
                        <td>{player.firstName}</td>
                        <td>{player.lastName}</td>
                        <td>{player.height}</td>
                        <td>{player.weight}</td>
                        <td>{player.college}</td>
                        <td>{player.handedness}</td>
                        <td>{player.age}</td>
                        <td>{player.jerseyNumber}</td>
                        <td>{player.yearsPro}</td>
                    
                        <!-- Position, Team, Archetype -->
                        <td>{player.position?.name}</td>  <!-- Using .name instead of .code -->
                        <td>{player.position?.type}</td>  <!-- Using .type instead of .positionType -->
                        <td>{player.team?.label}</td>
                        <td>{player.archetype?.name}</td>  <!-- Using .name instead of .label -->
                    
                        <!-- Abilities -->
                        <td>{player.abilities?.[0]?.name || ''}</td>
                        <td>{player.abilities?.[1]?.name || ''}</td>
                        <td>{player.abilities?.[2]?.name || ''}</td>
                        <td>{player.abilities?.[3]?.name || ''}</td>
                        <td>{player.abilities?.[4]?.name || ''}</td>
                        <td>{player.abilities?.[5]?.name || ''}</td>
                    
                        <!-- Stats - Note that stats is an array, need to access first element -->
                        <td>{player.stats?.[0]?.speed}</td>
                        <td>{player.stats?.[0]?.acceleration}</td>
                        <td>{player.stats?.[0]?.agility}</td>
                        <td>{player.stats?.[0]?.jumping}</td>
                        <td>{player.stats?.[0]?.stamina}</td>
                        <td>{player.stats?.[0]?.strength}</td>
                        <td>{player.stats?.[0]?.changeOfDirection}</td>
                        <td>{player.stats?.[0]?.awareness}</td>
                        <td>{player.stats?.[0]?.playRecognition}</td>
                        <td>{player.stats?.[0]?.toughness}</td>
                        <td>{player.stats?.[0]?.bcvision}</td>
                        <td>{player.stats?.[0]?.carrying}</td>
                        <td>{player.stats?.[0]?.breakTackle}</td>

                        <td>{player.stats?.[0]?.breakSack}</td>
                        <td>{player.stats?.[0]?.trucking}</td>
                        <td>{player.stats?.[0]?.stiffArm}</td>
                        <td>{player.stats?.[0]?.spinMove}</td>
                        <td>{player.stats?.[0]?.jukeMove}</td>
                        <td>{player.stats?.[0]?.catching}</td>
                        <td>{player.stats?.[0]?.catchInTraffic}</td>
                        <td>{player.stats?.[0]?.spectacularCatch}</td>
                        <td>{player.stats?.[0]?.shortRouteRunning}</td>
                        <td>{player.stats?.[0]?.mediumRouteRunning}</td>
                        <td>{player.stats?.[0]?.deepRouteRunning}</td>
                        <td>{player.stats?.[0]?.release}</td>
                        <td>{player.stats?.[0]?.throwPower}</td>
                        <td>{player.stats?.[0]?.throwAccuracyShort}</td>
                        <td>{player.stats?.[0]?.throwAccuracyMid}</td>
                        <td>{player.stats?.[0]?.throwAccuracyDeep}</td>
                        <td>{player.stats?.[0]?.throwOnTheRun}</td>
                        <td>{player.stats?.[0]?.throwUnderPressure}</td>
                        <td>{player.stats?.[0]?.playAction}</td>
                        <td>{player.stats?.[0]?.passBlock}</td>
                        <td>{player.stats?.[0]?.passBlockPower}</td>
                        <td>{player.stats?.[0]?.passBlockFinesse}</td>
                        <td>{player.stats?.[0]?.runBlock}</td>
                        <td>{player.stats?.[0]?.runBlockPower}</td>
                        <td>{player.stats?.[0]?.runBlockFinesse}</td>
                        <td>{player.stats?.[0]?.impactBlocking}</td>
                        <td>{player.stats?.[0]?.leadBlock}</td>
                        <td>{player.stats?.[0]?.tackle}</td>
                        <td>{player.stats?.[0]?.hitPower}</td>
                        <td>{player.stats?.[0]?.powerMoves}</td>
                        <td>{player.stats?.[0]?.finesseMoves}</td>
                        <td>{player.stats?.[0]?.blockShedding}</td>
                        <td>{player.stats?.[0]?.pursuit}</td>
                        <td>{player.stats?.[0]?.manCoverage}</td>
                        <td>{player.stats?.[0]?.zoneCoverage}</td>
                        <td>{player.stats?.[0]?.press}</td>
                        <td>{player.stats?.[0]?.kickPower}</td>
                        <td>{player.stats?.[0]?.kickAccuracy}</td>
                        <td>{player.stats?.[0]?.kickReturn}</td>
                        <td>{player.stats?.[0]?.injury}</td>
                        <td>{player.stats?.[0]?.runningStyle}</td>           
                        <td>{player.draftData?.overall_pick || '-'}</td>
                        <td>{player.draftData?.round || '-'}</td>
                        <td>{player.draftData?.round_pick || '-'}</td>             
                    </tr>
                {/each}
            </tbody>
        </table>
        {/if}
    </div>
    <div class="scrollbar-container">
        <div class="scrollbar-content"></div>
    </div>
</div>

<style>
    .table-wrapper {
        position: fixed;
        top: 60px; /* Update this to match navbar height */
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        background: white;
    }

    .table-container {
        flex: 1;
        overflow-x: scroll;
        overflow-y: scroll;
        margin: 0;
        padding: 0; /* Remove padding */
        color: #333;
        /* Hide the default scrollbar */
        scrollbar-width: none;
        -ms-overflow-style: none;
    }

    /* Hide the default scrollbar for Chrome/Safari */
    .table-container::-webkit-scrollbar {
        display: none;
    }

    .scrollbar-container {
        height: 16px; /* Height of the scrollbar */
        overflow-x: scroll;
        overflow-y: hidden;
        background: #f4f4f4;
        border-top: 1px solid #ddd;
    }

    .scrollbar-content {
        height: 1px; /* Minimal height */
        width: max-content;
    }

    table {
        width: max-content;
        min-width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    thead {
        position: sticky;
        top: 0;
        z-index: 10;
    }

    th {
        position: sticky;
        top: 0;
        background-color: #f4f4f4;
        font-weight: bold;
        color: #000;
        cursor: pointer;
        user-select: none;
        z-index: 10;
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }

    tbody {
        position: relative;
        z-index: 1;
    }

    /* Sticky columns */
    th:nth-child(-n+3) {
        position: sticky;
        left: 0;
        z-index: 11;
        background-color: #f4f4f4;
    }

    td:nth-child(-n+3) {
        position: sticky;
        left: 0;
        z-index: 1;
        background-color: white;
    }

    /* Position sticky columns */
    th:nth-child(1), td:nth-child(1) { 
        left: 0; 
    }
    
    th:nth-child(2), td:nth-child(2) { 
        left: var(--first-col-width, 80px);
    }
    
    th:nth-child(3), td:nth-child(3) { 
        left: var(--second-col-width, 160px);
    }

    /* Regular cells */
    td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
        background-color: white;
    }

    /* Row backgrounds */
    tr:hover td {
        background-color: #f5f5f5;
    }

    tr:nth-child(even) td {
        background-color: #f9f9f9;
    }

    /* Sticky column backgrounds */
    tr:hover td:nth-child(-n+3) {
        background-color: #f5f5f5 !important;
    }

    tr:nth-child(even) td:nth-child(-n+3) {
        background-color: #f9f9f9 !important;
    }

    /* Shadows */
    th:nth-child(3):after,
    td:nth-child(3):after {
        content: '';
        position: absolute;
        right: -5px;
        top: 0;
        bottom: 0;
        width: 5px;
        background: linear-gradient(to right, rgba(0,0,0,0.1), transparent);
        pointer-events: none;
    }

    thead::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -5px;
        height: 5px;
        background: linear-gradient(to bottom, rgba(0,0,0,0.1), transparent);
        pointer-events: none;
    }

    /* Error and loading states */
    .error {
        color: red;
        padding: 1em;
    }

    p {
        margin: 1em;
        text-align: center;
    }
</style>
