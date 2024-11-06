<script lang="ts">
    import PlayerAnalysisTable from '../lib/PlayerAnalysisTable.svelte';
</script>

<div class="draft">
    <h1>Player Analysis</h1>
    <PlayerAnalysisTable />
</div>

<style>
    .draft {
        max-width: 100%;
        margin: 80px auto 0; /* Added top margin to account for fixed navbar */
        padding: 0 20px;
    }

    h1 {
        text-align: center;
        color: #2c3e50;
        margin-bottom: 2rem;
    }
</style>