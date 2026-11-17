<script>
  import '$lib/styles.css';
  import { page } from '$app/state';
  import Nav from '$lib/components/Nav.svelte';
  import Corners from '$lib/components/Corners.svelte';
  import Icon from '$lib/components/Icon.svelte';
  let { data, children } = $props();
  let path = $derived(page.url.pathname);
  const tabs = [['/', 'home', 'Home'], ['/lists', 'list', 'Lists'], ['/new', 'plus', 'Add'], ['/try', 'mark', 'Try list'], ['/people', 'people', 'People']];
</script>

<svelte:head><title>You Should Try</title></svelte:head>

{#if data.dbMissing}
  <div class="wrap"><h1 class="h2">The database isn't connected yet</h1><p>Follow step 2 in the README to create the database and paste its ID into <code>wrangler.jsonc</code>.</p></div>
{:else}
  <div class="wrap">
    {#if path !== '/'}
      <div class="frame"><div class="board strip"><Corners size={56} /><div class="inner"><Nav {path} user={data.user} counts={data.counts} /></div></div></div>
    {/if}
    {@render children()}

    <footer class="foot">
      <form method="POST" action="/demo?/switch" class="demo">
        <label for="demo-user">Demo: viewing as</label>
        <select id="demo-user" name="user" onchange={(e) => e.currentTarget.form.requestSubmit()}>
          {#each data.demoPeople as p}<option value={p.id} selected={p.id === data.user?.id}>{p.name}</option>{/each}
        </select>
        <noscript><button class="btn sm">Switch</button></noscript>
      </form>
      <span>You Should Try… · invite only · sign-in comes next</span>
    </footer>
  </div>

  <nav class="tabbar" aria-label="Main">
    {#each tabs as [href, icon, label]}
      <a {href} class:add={icon === 'plus'} aria-current={(href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined}>
        {#if icon === 'plus'}<span class="plus"><Icon name="plus" size={24} /></span>{:else}<Icon name={icon} size={22} />{/if}
        <span>{label}</span>
      </a>
    {/each}
  </nav>
{/if}

<style>
  .strip { padding: 14px 30px 16px; }
  .inner { position: relative; padding: 0 30px; }
  .foot { margin-top: 60px; padding-top: 16px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-size: 13px; color: var(--ink-3); font-family: var(--serif); font-style: italic; }
  .demo { display: flex; gap: 8px; align-items: center; font-family: var(--body); font-style: normal; }
  .demo select { min-height: 36px; border: 1.5px solid #CFCDC4; border-radius: 6px; padding: 0 8px; font: 14px var(--body); background: #fff; }
  .tabbar { display: none; }
  @media (max-width: 640px) {
    .strip { padding: 8px 12px 10px; }
    .inner { padding: 0; }
    .tabbar { display: flex; position: fixed; left: 0; right: 0; bottom: 0; height: 74px; background: #fff; border-top: 1px solid #E2E0D8; padding: 8px 6px 0; z-index: 20; }
    .tabbar a { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; color: var(--ink-3); font-size: 11px; font-weight: 600; }
    .tabbar a[aria-current='page'] { color: var(--slate); font-weight: 800; }
    .plus { width: 48px; height: 48px; border-radius: 50%; background: var(--slate); color: var(--chalk); display: flex; align-items: center; justify-content: center; margin-top: -18px; border: 3px solid #fff; }
  }
</style>
