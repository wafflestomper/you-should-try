<script>
  import Ribbon from './Ribbon.svelte';
  import Icon from './Icon.svelte';
  import Avatar from './Avatar.svelte';
  let { path = '/', user, counts, showLogo = true } = $props();
  const links = [
    ['/', 'Home'], ['/lists', 'Lists'], ['/people', 'People'], ['/try', 'Try list'], ['/charts', 'The Hot 40']
  ];
  const on = (href) => (href === '/' ? path === '/' : path.startsWith(href));
</script>

<nav aria-label="Main" class="nav">
  {#if showLogo}
    <a href="/" class="logo" aria-label="You Should Try, home"><span class="script" style="font-size:26px">You should</span><Ribbon w={96} h={30} size={15} /></a>
  {/if}
  <div class="links cap">
    {#each links as [href, label]}
      <a {href} aria-current={on(href) ? 'page' : undefined}>{label}{#if href === '/try' && counts.tries} · {counts.tries}{/if}</a>
    {/each}
  </div>
  <div class="right">
    <a href="/new" class="btn chalk sm"><Icon name="plus" size={18} />New top 10</a>
    <a href="/notes" class="bell" aria-label="Notifications, {counts.unread} new"><Icon name="bell" size={24} />{#if counts.unread}<span class="badge">{counts.unread}</span>{/if}</a>
    {#if user}<Avatar name={user.name} color="#F1F0EA" size={34} />{/if}
  </div>
</nav>

<style>
  .nav { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
  .logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
  .links { display: flex; gap: 20px; flex-wrap: wrap; font-size: 13.5px; }
  .links a { text-decoration: none; color: #D8D7CF; padding-bottom: 3px; }
  .links a[aria-current='page'] { color: var(--chalk); border-bottom: 2px solid var(--chalk); }
  .right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
  .right :global(.av) { color: var(--slate) !important; }
  .bell { position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
  .badge { position: absolute; top: 5px; right: 4px; background: var(--chalk-yellow); color: var(--slate); border-radius: 9px; font-size: 11px; font-weight: 800; padding: 0 5px; }
  @media (max-width: 760px) { .links, .right :global(.btn) { display: none; } }
</style>
