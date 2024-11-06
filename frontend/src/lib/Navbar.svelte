<script lang="ts">
    let currentPath = window.location.pathname;

    // Update current path when navigation occurs
    window.addEventListener('popstate', () => {
        currentPath = window.location.pathname;
    });
</script>

<nav>
    <div class="nav-content">
        <div class="logo">
            <a href="/">Madden Draft Assistant</a>
        </div>
        <ul class="nav-links">
            <li>
                <a 
                    href="/" 
                    class:active={currentPath === '/'}>
                    Player Database
                </a>
            </li>
            <li>
                <a 
                    href="/draft" 
                    class:active={currentPath === '/draft'}>
                    Draft Recommender
                </a>
            </li>
            <li>
                <a 
                    href="/analysis" 
                    class:active={currentPath === '/analysis'}>
                    Position Analysis
                </a>
            </li>
        </ul>
    </div>
</nav>

<style>
    nav {
        background-color: #2c3e50;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .nav-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .logo a {
        color: #fff;
        font-size: 1.5rem;
        font-weight: bold;
        text-decoration: none;
    }

    .nav-links {
        display: flex;
        gap: 2rem;
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .nav-links a {
        color: #ecf0f1;
        text-decoration: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        transition: background-color 0.2s;
    }

    .nav-links a:hover {
        background-color: #34495e;
    }

    .nav-links a.active {
        background-color: #3498db;
    }
</style>