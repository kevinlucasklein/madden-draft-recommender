<script lang="ts">
    import DraftBoard from '../lib/DraftBoard.svelte';
</script>

<div class="draft">
    <h1>Draft Board</h1>
    <DraftBoard />
</div>

<style>
    .draft {
        max-width: 100%;
        margin: 80px auto 0;
        padding: 0 20px;
    }

    h1 {
        text-align: center;
        color: #ecf0f1;
        margin-bottom: 2rem;
    }
</style>