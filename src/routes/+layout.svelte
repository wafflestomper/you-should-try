<script>
  import '$lib/styles.css';
  import '$lib/plain.css';
  import TopBar from '$lib/components/TopBar.svelte';
  import { page, updated } from '$app/state';
  import { beforeNavigate } from '$app/navigation';
  import Nav from '$lib/components/Nav.svelte';
  import Corners from '$lib/components/Corners.svelte';
  import Icon from '$lib/components/Icon.svelte';
  let { data, children } = $props();
  let path = $derived(page.url.pathname);
  let look = $state(data.look ?? 'light');
  function setLook(v) {
    look = v;
    document.cookie = `yst_look=${v}; path=/; max-age=31536000; samesite=lax`;
  }
  $effect(() => { document.documentElement.dataset.look = look; });
  import { onMount } from 'svelte';
  import { listenForInstall } from '$lib/install.svelte.js';
  onMount(listenForInstall);
  // After the site is updated, the next tap to another page loads the new version cleanly
  beforeNavigate(({ willUnload, to }) => { if (updated.current && !willUnload && to?.url) location.href = to.url.href; });
  const tabs = [['/', 'home', 'Board'], ['/add', 'plus', 'Add'], ['/mine', 'check', 'History']];
</script>

<svelte:head><title>You Should Try</title></svelte:head>

{#if data.dbMissing}
  <div class="wrap"><h1 class="h2">The database isn't connected yet</h1><p>Follow step 2 in the README to create the database and paste its ID into <code>wrangler.jsonc</code>.</p></div>
{:else if !data.user}
  <div class="app look-{look}"><div class="wrap">{@render children()}</div></div>
{:else}
  {#if data.realUser?.is_guest}
    <div class="banner"><span>You're in as a guest, invited by a friend. Everything works on this device. Sign in with Google to keep your lists everywhere.</span><a class="gb" href="/auth/google">Sign in with Google</a></div>
  {/if}
  {#if data.realUser && data.user.id !== data.realUser.id}
    <div class="banner viewing"><span>You're seeing the site as <b>{data.user.name}</b>.</span>
      <form method="POST" action="/view-as"><input type="hidden" name="user" value="" /><button class="gb">Back to me</button></form></div>
  {/if}
  <div class="app look-{look}">
  <TopBar {path} counts={data.counts} {look} {setLook} />
  <div class="wrap">
    {@render children()}

    <footer class="foot">
      {#if data.realUser?.is_admin}
        <form method="POST" action="/view-as" class="demo">
          <label for="view-as">Admin: view as</label>
          <select id="view-as" name="user" onchange={(e) => e.currentTarget.form.requestSubmit()}>
            {#each data.viewAsPeople as p}<option value={p.id} selected={p.id === data.user.id}>{p.name}</option>{/each}
          </select>
          <a href="/admin" class="small">Admin page</a>
        </form>
      {/if}
      <a href="/people" class="small">People and invites</a>
      <a href="/me" class="small">Your profile</a>
      <a href="/install" class="small">Add to home screen</a>
      <form method="POST" action="/signout"><button class="linkish">Sign out</button></form>
      <span>You Should Try… · invite only</span>
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
  </div>
{/if}

<style>
  .strip { padding: 14px 30px 16px; }
  .inner { position: relative; padding: 0 30px; }
  .foot { margin-top: 60px; padding-top: 16px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-size: 13px; color: var(--ink-3); }
  .demo { display: flex; gap: 8px; align-items: center; font-family: var(--body); font-style: normal; }
  .demo select { min-height: 36px; border: 1.5px solid var(--line); border-radius: 6px; padding: 0 8px; font: 14px var(--body); background: var(--surface-2); }
  .tabbar { display: none; }
  .banner { background: #1F2937; color: #fff; display: flex; gap: 14px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 10px 16px; font-size: 14.5px; }
  .banner.viewing { background: #7A5C00; }
  .banner form { margin: 0; }
  .gb { background: var(--surface-2); color: #1f1f1f; border: 0; border-radius: 18px; padding: 7px 14px; font: 700 14px var(--body); text-decoration: none; cursor: pointer; }
  .linkish { background: none; border: 0; padding: 0; font: inherit; color: var(--green); text-decoration: underline; cursor: pointer; }
  @media (max-width: 640px) {
    .strip { padding: 8px 12px 10px; }
    .inner { padding: 0; }
    .tabbar { display: flex; position: fixed; left: 0; right: 0; bottom: 0; height: 74px; background: var(--surface-2); border-top: 1px solid var(--line); padding: 8px 6px 0; z-index: 20; }
    .tabbar a { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; color: var(--ink-3); font-size: 11px; font-weight: 600; }
    .tabbar a[aria-current='page'] { color: var(--accent); font-weight: 800; }
    .plus { width: 56px; height: 56px; border-radius: 50%; background: var(--ink); color: var(--bg); display: flex; align-items: center; justify-content: center; margin-top: -18px; border: 3px solid var(--bg); }
  }
</style>
