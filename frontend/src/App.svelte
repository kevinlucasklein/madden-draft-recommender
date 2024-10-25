<script lang="ts">
  import MaddenTable from './lib/MaddenTable.svelte';
</script>

<main>
  <h1>Madden NFL Ratings</h1>
  <MaddenTable />
</main>

<style>
  main {
    padding: 1em;
    max-width: 100%;
    margin: 0 auto;
  }
  h1 {
    text-align: center;
    color: #ff3e00;
  }
</style>