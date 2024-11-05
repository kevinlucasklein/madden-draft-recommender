<script lang="ts">
    import DraftRecommender from '../lib/DraftRecommender.svelte';
</script>

<div class="draft">
    <h1>Draft Recommender</h1>
    <DraftRecommender />
</div>

<style>
    .draft {
        max-width: 100%;
        margin: 0 auto;
    }

    h1 {
        text-align: center;
        color: #2c3e50;
        margin-bottom: 2rem;
    }
</style>