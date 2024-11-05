<script lang="ts">
    import Navbar from './Navbar.svelte';
</script>

<div class="app">
    <Navbar />
    <main>
        <slot />
    </main>
</div>

<style>
    .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    main {
        margin-top: 60px; /* Height of navbar */
        flex: 1;
        padding: 1rem;
    }

    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                     Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
    }
</style>