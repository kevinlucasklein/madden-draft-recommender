<script lang="ts">
    import { onMount } from 'svelte';

    let tableContainer: HTMLElement;
    let scrollbarContainer: HTMLElement;

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
  
    interface PlayerData {
        // Player base info
        overall_rating: number;
        first_name: string;
        last_name: string;
        height: string;
        weight: number;
        college: string;
        handedness: string;
        age: number;
        jersey_num: number;
        years_pro: number;

        // Abilities and labels
        ability1: string;
        ability2: string;
        ability3: string;
        ability4: string;
        ability5: string;
        ability6: string;
        archetype_label: string;
        team_label: string;
        position: string;
        position_type: string;

        // Player stats
        acceleration: number;
        agility: number;
        jumping: number;
        stamina: number;
        strength: number;
        awareness: number;
        bcvision: number;
        block_shedding: number;
        break_sack: number;
        break_tackle: number;
        carrying: number;
        catch_in_traffic: number;
        catching: number;
        change_of_direction: number;
        deep_route_running: number;
        finesse_moves: number;
        hit_power: number;
        impact_blocking: number;
        injury: number;
        juke_move: number;
        kick_accuracy: number;
        kick_power: number;
        kick_return: number;
        lead_block: number;
        man_coverage: number;
        medium_route_running: number;
        pass_block: number;
        pass_block_finesse: number;
        pass_block_power: number;
        play_action: number;
        play_recognition: number;
        power_moves: number;
        press: number;
        pursuit: number;
        release: number;
        run_block: number;
        run_block_finesse: number;
        run_block_power: number;
        running_style: string;
        short_route_running: number;
        spectacular_catch: number;
        speed: number;
        spin_move: number;
        stiff_arm: number;
        tackle: number;
        throw_accuracy_deep: number;
        throw_accuracy_mid: number;
        throw_accuracy_short: number;
        throw_on_the_run: number;
        throw_power: number;
        throw_under_pressure: number;
        toughness: number;
        trucking: number;
        zone_coverage: number;
    }
  
    let players: PlayerData[] = [];
    let loading = true;
    let error: string | null = null;

    // Add sorting state
    let sortColumn: keyof PlayerData | null = 'overall_rating';
    let sortDirection: 'asc' | 'desc' = 'desc';

     // Sorting function
     function sortPlayers(column: keyof PlayerData) {
        if (sortColumn === column) {
            // If clicking the same column, reverse the sort direction
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New column, set it as sort column and default to descending
            sortColumn = column;
            sortDirection = 'desc';
        }

        players = players.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];

            // Handle null/undefined values
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            // Sort based on type
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // String comparison
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            return sortDirection === 'asc' 
                ? aStr.localeCompare(bStr)
                : bStr.localeCompare(aStr);
        });
    }
  
    onMount(async () => {
        try {
            const response = await fetch('http://localhost:3000/api/players/full');
            if (!response.ok) throw new Error('Failed to fetch data');
            players = await response.json();
            // Initial sort
            sortPlayers('overall_rating');
        } catch (e) {
            error = e instanceof Error ? e.message : 'An error occurred';
        } finally {
            loading = false;
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
                    <th on:click={() => sortPlayers('overall_rating')} class:sorted={sortColumn === 'overall_rating'} class:asc={sortDirection === 'asc'}>
                        Overall {sortColumn === 'overall_rating' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('first_name')} class:sorted={sortColumn === 'first_name'} class:asc={sortDirection === 'asc'}>
                        First Name {sortColumn === 'first_name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('last_name')} class:sorted={sortColumn === 'last_name'} class:asc={sortDirection === 'asc'}>
                        Last Name {sortColumn === 'last_name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('height')} class:sorted={sortColumn === 'height'} class:asc={sortDirection === 'asc'}>
                        Height {sortColumn === 'height' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('weight')} class:sorted={sortColumn === 'weight'} class:asc={sortDirection === 'asc'}>
                        Weight {sortColumn === 'weight' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('college')} class:sorted={sortColumn === 'college'} class:asc={sortDirection === 'asc'}>
                        College {sortColumn === 'college' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('handedness')} class:sorted={sortColumn === 'handedness'} class:asc={sortDirection === 'asc'}>
                        Handedness {sortColumn === 'handedness' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('age')} class:sorted={sortColumn === 'age'} class:asc={sortDirection === 'asc'}>
                        Age {sortColumn === 'age' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('jersey_num')} class:sorted={sortColumn === 'jersey_num'} class:asc={sortDirection === 'asc'}>
                        Jersey # {sortColumn === 'jersey_num' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('years_pro')} class:sorted={sortColumn === 'years_pro'} class:asc={sortDirection === 'asc'}>
                        Years Pro {sortColumn === 'years_pro' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    
                    <!-- Position and Team Info -->
                    <th on:click={() => sortPlayers('position')} class:sorted={sortColumn === 'position'} class:asc={sortDirection === 'asc'}>
                        Position {sortColumn === 'position' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('position_type')} class:sorted={sortColumn === 'position_type'} class:asc={sortDirection === 'asc'}>
                        Position Type {sortColumn === 'position_type' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('team_label')} class:sorted={sortColumn === 'team_label'} class:asc={sortDirection === 'asc'}>
                        Team {sortColumn === 'team_label' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('archetype_label')} class:sorted={sortColumn === 'archetype_label'} class:asc={sortDirection === 'asc'}>
                        Archetype {sortColumn === 'archetype_label' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    
                    <!-- Abilities -->
                    <th on:click={() => sortPlayers('ability1')} class:sorted={sortColumn === 'ability1'} class:asc={sortDirection === 'asc'}>
                        Ability 1 {sortColumn === 'ability1' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('ability2')} class:sorted={sortColumn === 'ability2'} class:asc={sortDirection === 'asc'}>
                        Ability 2 {sortColumn === 'ability2' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('ability3')} class:sorted={sortColumn === 'ability3'} class:asc={sortDirection === 'asc'}>
                        Ability 3 {sortColumn === 'ability3' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('ability4')} class:sorted={sortColumn === 'ability4'} class:asc={sortDirection === 'asc'}>
                        Ability 4 {sortColumn === 'ability4' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('ability5')} class:sorted={sortColumn === 'ability5'} class:asc={sortDirection === 'asc'}>
                        Ability 5 {sortColumn === 'ability5' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('ability6')} class:sorted={sortColumn === 'ability6'} class:asc={sortDirection === 'asc'}>
                        Ability 6 {sortColumn === 'ability6' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>

                    <!-- Physical Attributes -->
                    <th on:click={() => sortPlayers('speed')} class:sorted={sortColumn === 'speed'} class:asc={sortDirection === 'asc'}>
                        Speed {sortColumn === 'speed' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('acceleration')} class:sorted={sortColumn === 'acceleration'} class:asc={sortDirection === 'asc'}>
                        Acceleration {sortColumn === 'acceleration' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('agility')} class:sorted={sortColumn === 'agility'} class:asc={sortDirection === 'asc'}>
                        Agility {sortColumn === 'agility' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('jumping')} class:sorted={sortColumn === 'jumping'} class:asc={sortDirection === 'asc'}>
                        Jumping {sortColumn === 'jumping' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('stamina')} class:sorted={sortColumn === 'stamina'} class:asc={sortDirection === 'asc'}>
                        Stamina {sortColumn === 'stamina' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('strength')} class:sorted={sortColumn === 'strength'} class:asc={sortDirection === 'asc'}>
                        Strength {sortColumn === 'strength' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('change_of_direction')} class:sorted={sortColumn === 'change_of_direction'} class:asc={sortDirection === 'asc'}>
                        Change of Direction {sortColumn === 'change_of_direction' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>

                    <!-- Mental Attributes -->
                    <!-- Mental Attributes -->
                    <th on:click={() => sortPlayers('awareness')} class:sorted={sortColumn === 'awareness'} class:asc={sortDirection === 'asc'}>
                        Awareness {sortColumn === 'awareness' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('play_recognition')} class:sorted={sortColumn === 'play_recognition'} class:asc={sortDirection === 'asc'}>
                        Play Recognition {sortColumn === 'play_recognition' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('toughness')} class:sorted={sortColumn === 'toughness'} class:asc={sortDirection === 'asc'}>
                        Toughness {sortColumn === 'toughness' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>

                    <!-- Offensive Skills -->
                    <th on:click={() => sortPlayers('bcvision')} class:sorted={sortColumn === 'bcvision'} class:asc={sortDirection === 'asc'}>
                        BC Vision {sortColumn === 'bcvision' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('carrying')} class:sorted={sortColumn === 'carrying'} class:asc={sortDirection === 'asc'}>
                        Carrying {sortColumn === 'carrying' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('break_tackle')} class:sorted={sortColumn === 'break_tackle'} class:asc={sortDirection === 'asc'}>
                        Break Tackle {sortColumn === 'break_tackle' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('break_sack')} class:sorted={sortColumn === 'break_sack'} class:asc={sortDirection === 'asc'}>
                        Break Sack {sortColumn === 'break_sack' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('trucking')} class:sorted={sortColumn === 'trucking'} class:asc={sortDirection === 'asc'}>
                        Trucking {sortColumn === 'trucking' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('stiff_arm')} class:sorted={sortColumn === 'stiff_arm'} class:asc={sortDirection === 'asc'}>
                        Stiff Arm {sortColumn === 'stiff_arm' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('spin_move')} class:sorted={sortColumn === 'spin_move'} class:asc={sortDirection === 'asc'}>
                        Spin Move {sortColumn === 'spin_move' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('juke_move')} class:sorted={sortColumn === 'juke_move'} class:asc={sortDirection === 'asc'}>
                        Juke Move {sortColumn === 'juke_move' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('catching')} class:sorted={sortColumn === 'catching'} class:asc={sortDirection === 'asc'}>
                        Catching {sortColumn === 'catching' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('catch_in_traffic')} class:sorted={sortColumn === 'catch_in_traffic'} class:asc={sortDirection === 'asc'}>
                        Catch In Traffic {sortColumn === 'catch_in_traffic' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('spectacular_catch')} class:sorted={sortColumn === 'spectacular_catch'} class:asc={sortDirection === 'asc'}>
                        Spectacular Catch {sortColumn === 'spectacular_catch' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('short_route_running')} class:sorted={sortColumn === 'short_route_running'} class:asc={sortDirection === 'asc'}>
                        Short Route Running {sortColumn === 'short_route_running' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('medium_route_running')} class:sorted={sortColumn === 'medium_route_running'} class:asc={sortDirection === 'asc'}>
                        Medium Route Running {sortColumn === 'medium_route_running' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('deep_route_running')} class:sorted={sortColumn === 'deep_route_running'} class:asc={sortDirection === 'asc'}>
                        Deep Route Running {sortColumn === 'deep_route_running' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('release')} class:sorted={sortColumn === 'release'} class:asc={sortDirection === 'asc'}>
                        Release {sortColumn === 'release' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>

                    <!-- Passing Skills -->
                    <th on:click={() => sortPlayers('throw_power')} class:sorted={sortColumn === 'throw_power'} class:asc={sortDirection === 'asc'}>
                        Throw Power {sortColumn === 'throw_power' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('throw_accuracy_short')} class:sorted={sortColumn === 'throw_accuracy_short'} class:asc={sortDirection === 'asc'}>
                        Throw Accuracy Short {sortColumn === 'throw_accuracy_short' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('throw_accuracy_mid')} class:sorted={sortColumn === 'throw_accuracy_mid'} class:asc={sortDirection === 'asc'}>
                        Throw Accuracy Mid {sortColumn === 'throw_accuracy_mid' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('throw_accuracy_deep')} class:sorted={sortColumn === 'throw_accuracy_deep'} class:asc={sortDirection === 'asc'}>
                        Throw Accuracy Deep {sortColumn === 'throw_accuracy_deep' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('throw_on_the_run')} class:sorted={sortColumn === 'throw_on_the_run'} class:asc={sortDirection === 'asc'}>
                        Throw On The Run {sortColumn === 'throw_on_the_run' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('throw_under_pressure')} class:sorted={sortColumn === 'throw_under_pressure'} class:asc={sortDirection === 'asc'}>
                        Throw Under Pressure {sortColumn === 'throw_under_pressure' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('play_action')} class:sorted={sortColumn === 'play_action'} class:asc={sortDirection === 'asc'}>
                        Play Action {sortColumn === 'play_action' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>

                    <!-- Blocking Skills -->
                    <th on:click={() => sortPlayers('pass_block')} class:sorted={sortColumn === 'pass_block'} class:asc={sortDirection === 'asc'}>
                        Pass Block {sortColumn === 'pass_block' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('pass_block_power')} class:sorted={sortColumn === 'pass_block_power'} class:asc={sortDirection === 'asc'}>
                        Pass Block Power {sortColumn === 'pass_block_power' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('pass_block_finesse')} class:sorted={sortColumn === 'pass_block_finesse'} class:asc={sortDirection === 'asc'}>
                        Pass Block Finesse {sortColumn === 'pass_block_finesse' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('run_block')} class:sorted={sortColumn === 'run_block'} class:asc={sortDirection === 'asc'}>
                        Run Block {sortColumn === 'run_block' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('run_block_power')} class:sorted={sortColumn === 'run_block_power'} class:asc={sortDirection === 'asc'}>
                        Run Block Power {sortColumn === 'run_block_power' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('run_block_finesse')} class:sorted={sortColumn === 'run_block_finesse'} class:asc={sortDirection === 'asc'}>
                        Run Block Finesse {sortColumn === 'run_block_finesse' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('impact_blocking')} class:sorted={sortColumn === 'impact_blocking'} class:asc={sortDirection === 'asc'}>
                        Impact Blocking {sortColumn === 'impact_blocking' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('lead_block')} class:sorted={sortColumn === 'lead_block'} class:asc={sortDirection === 'asc'}>
                        Lead Block {sortColumn === 'lead_block' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>

                    <!-- Defensive Skills -->
                    <th on:click={() => sortPlayers('tackle')} class:sorted={sortColumn === 'tackle'} class:asc={sortDirection === 'asc'}>
                        Tackle {sortColumn === 'tackle' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('hit_power')} class:sorted={sortColumn === 'hit_power'} class:asc={sortDirection === 'asc'}>
                        Hit Power {sortColumn === 'hit_power' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('power_moves')} class:sorted={sortColumn === 'power_moves'} class:asc={sortDirection === 'asc'}>
                        Power Moves {sortColumn === 'power_moves' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('finesse_moves')} class:sorted={sortColumn === 'finesse_moves'} class:asc={sortDirection === 'asc'}>
                        Finesse Moves {sortColumn === 'finesse_moves' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('block_shedding')} class:sorted={sortColumn === 'block_shedding'} class:asc={sortDirection === 'asc'}>
                        Block Shedding {sortColumn === 'block_shedding' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('pursuit')} class:sorted={sortColumn === 'pursuit'} class:asc={sortDirection === 'asc'}>
                        Pursuit {sortColumn === 'pursuit' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('man_coverage')} class:sorted={sortColumn === 'man_coverage'} class:asc={sortDirection === 'asc'}>
                        Man Coverage {sortColumn === 'man_coverage' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('zone_coverage')} class:sorted={sortColumn === 'zone_coverage'} class:asc={sortDirection === 'asc'}>
                        Zone Coverage {sortColumn === 'zone_coverage' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('press')} class:sorted={sortColumn === 'press'} class:asc={sortDirection === 'asc'}>
                        Press {sortColumn === 'press' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>

                    <!-- Special Teams -->
                    <th on:click={() => sortPlayers('kick_power')} class:sorted={sortColumn === 'kick_power'} class:asc={sortDirection === 'asc'}>
                        Kick Power {sortColumn === 'kick_power' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('kick_accuracy')} class:sorted={sortColumn === 'kick_accuracy'} class:asc={sortDirection === 'asc'}>
                        Kick Accuracy {sortColumn === 'kick_accuracy' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('kick_return')} class:sorted={sortColumn === 'kick_return'} class:asc={sortDirection === 'asc'}>
                        Kick Return {sortColumn === 'kick_return' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>

                    <!-- Other -->
                    <th on:click={() => sortPlayers('injury')} class:sorted={sortColumn === 'injury'} class:asc={sortDirection === 'asc'}>
                        Injury {sortColumn === 'injury' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th on:click={() => sortPlayers('running_style')} class:sorted={sortColumn === 'running_style'} class:asc={sortDirection === 'asc'}>
                        Running Style {sortColumn === 'running_style' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each players as player}
                    <tr>
                        <!-- Base Info -->
                        <td>{player.overall_rating}</td>
                        <td>{player.first_name}</td>
                        <td>{player.last_name}</td>
                        <td>{player.height}</td>
                        <td>{player.weight}</td>
                        <td>{player.college}</td>
                        <td>{player.handedness}</td>
                        <td>{player.age}</td>
                        <td>{player.jersey_num}</td>
                        <td>{player.years_pro}</td>

                        <!-- Position and Team Info -->
                        <td>{player.position}</td>
                        <td>{player.position_type}</td>
                        <td>{player.team_label}</td>
                        <td>{player.archetype_label}</td>

                        <!-- Abilities -->
                        <td>{player.ability1}</td>
                        <td>{player.ability2}</td>
                        <td>{player.ability3}</td>
                        <td>{player.ability4}</td>
                        <td>{player.ability5}</td>
                        <td>{player.ability6}</td>

                        <!-- Physical Attributes -->
                        <td>{player.speed}</td>
                        <td>{player.acceleration}</td>
                        <td>{player.agility}</td>
                        <td>{player.jumping}</td>
                        <td>{player.stamina}</td>
                        <td>{player.strength}</td>
                        <td>{player.change_of_direction}</td>

                        <!-- Mental Attributes -->
                        <td>{player.awareness}</td>
                        <td>{player.play_recognition}</td>
                        <td>{player.toughness}</td>

                        <!-- Offensive Skills -->
                        <td>{player.bcvision}</td>
                        <td>{player.carrying}</td>
                        <td>{player.break_tackle}</td>
                        <td>{player.break_sack}</td>
                        <td>{player.trucking}</td>
                        <td>{player.stiff_arm}</td>
                        <td>{player.spin_move}</td>
                        <td>{player.juke_move}</td>
                        <td>{player.catching}</td>
                        <td>{player.catch_in_traffic}</td>
                        <td>{player.spectacular_catch}</td>
                        <td>{player.short_route_running}</td>
                        <td>{player.medium_route_running}</td>
                        <td>{player.deep_route_running}</td>
                        <td>{player.release}</td>

                        <!-- Passing Skills -->
                        <td>{player.throw_power}</td>
                        <td>{player.throw_accuracy_short}</td>
                        <td>{player.throw_accuracy_mid}</td>
                        <td>{player.throw_accuracy_deep}</td>
                        <td>{player.throw_on_the_run}</td>
                        <td>{player.throw_under_pressure}</td>
                        <td>{player.play_action}</td>

                        <!-- Blocking Skills -->
                        <td>{player.pass_block}</td>
                        <td>{player.pass_block_power}</td>
                        <td>{player.pass_block_finesse}</td>
                        <td>{player.run_block}</td>
                        <td>{player.run_block_power}</td>
                        <td>{player.run_block_finesse}</td>
                        <td>{player.impact_blocking}</td>
                        <td>{player.lead_block}</td>

                        <!-- Defensive Skills -->
                        <td>{player.tackle}</td>
                        <td>{player.hit_power}</td>
                        <td>{player.power_moves}</td>
                        <td>{player.finesse_moves}</td>
                        <td>{player.block_shedding}</td>
                        <td>{player.pursuit}</td>
                        <td>{player.man_coverage}</td>
                        <td>{player.zone_coverage}</td>
                        <td>{player.press}</td>

                        <!-- Special Teams -->
                        <td>{player.kick_power}</td>
                        <td>{player.kick_accuracy}</td>
                        <td>{player.kick_return}</td>

                        <!-- Other -->
                        <td>{player.injury}</td>
                        <td>{player.running_style}</td>
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
        top: 0;
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
