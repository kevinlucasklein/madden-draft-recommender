<script lang="ts">
    import MaddenTable from '../lib/MaddenTable.svelte';
</script>

<div class="home">
    <h1>Player Database</h1>
    <MaddenTable />
</div>

<style>
    .home {
        max-width: 100%;
        margin: 0 auto;
    }

    h1 {
        text-align: center;
        color: #2c3e50;
        margin-bottom: 2rem;
    }
</style>