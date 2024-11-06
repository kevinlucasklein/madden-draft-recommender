<script lang="ts">
  import { onMount } from 'svelte';
  import Layout from './lib/Layout.svelte';
  import Home from './routes/Home.svelte';
  import Draft from './routes/Draft.svelte';
  import Analysis from './routes/Analysis.svelte';

  let currentRoute: string;

  function handleNavigation() {
      currentRoute = window.location.pathname;
  }

  onMount(() => {
      handleNavigation();
      window.addEventListener('popstate', handleNavigation);
      
      // Handle clicks on anchor tags
      document.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('/')) {
              e.preventDefault();
              const href = target.getAttribute('href') || '/';
              window.history.pushState({}, '', href);
              handleNavigation();
          }
      });

      return () => {
          window.removeEventListener('popstate', handleNavigation);
      };
  });
</script>

<Layout>
  {#if currentRoute === '/'}
      <Home />
  {:else if currentRoute === '/draft'}
      <Draft />
  {:else if currentRoute === '/analysis'}
      <Analysis />
  {:else}
      <div class="not-found">
          <h1>404 - Page Not Found</h1>
          <a href="/">Go Home</a>
      </div>
  {/if}
</Layout>

<style>
  .not-found {
      text-align: center;
      padding: 2rem;
  }

  .not-found h1 {
      color: #2c3e50;
  }

  .not-found a {
      color: #3498db;
      text-decoration: none;
  }

  .not-found a:hover {
      text-decoration: underline;
  }
</style>