<script>
  import Logo from './Logo.svelte';
  let { path = '/', counts = {}, look = 'light', setLook = () => {} } = $props();
  const links = [['/', 'Board'], ['/watching', 'Watching'], ['/mine', 'History'], ['/people', 'People']];
  const on = (h) => (h === '/' ? path === '/' : path.startsWith(h));
</script>

<header class="top">
  <a href="/" class="brand" aria-label="You should try, home"><Logo size={32} tone={look === 'dark' ? 'light' : 'ink'} /></a>
  <nav aria-label="Main" class="links">
    {#each links as [href, label]}<a {href} aria-current={on(href) ? 'page' : undefined}>{label}</a>{/each}
  </nav>
  <div class="right">
    <div class="lookset" role="group" aria-label="Look">
      <button aria-pressed={look === 'light'} onclick={() => setLook('light')} title="Light look" aria-label="Light look">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <button aria-pressed={look === 'dark'} onclick={() => setLook('dark')} title="Dark look" aria-label="Dark look">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z"/></svg>
      </button>
    </div>
    <button class="bell looktoggle" onclick={() => setLook(look === 'dark' ? 'light' : 'dark')} aria-label={look === 'dark' ? 'Switch to light look' : 'Switch to dark look'} title="Light or dark">
      {#if look === 'dark'}<svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      {:else}<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z"/></svg>{/if}
    </button>
    <a href="/people#invite" class="bell" aria-label="Invite someone" title="Invite someone">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9.5" cy="8" r="3.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 20c.6-3.6 3.5-5.6 7-5.6s6.4 2 7 5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 7.5v6M16 10.5h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </a>
    <a href="/notes" class="bell" aria-label="Notifications, {counts.unread || 0} new">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
      {#if counts.unread}<span class="badge">{counts.unread}</span>{/if}
    </a>
    <a href="/add" class="mic" aria-label="Say a recommendation">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6-3.5a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.59a6 6 0 0 0 5-5.91Z"/></svg>
    </a>
  </div>
</header>

<style>
  .top { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 18px; padding: 10px 14px; background: color-mix(in srgb, var(--bg) 88%, transparent); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); border-bottom: 1px solid var(--line); }
  .brand { text-decoration: none; display: flex; }
  .links { display: flex; gap: 16px; }
  .links a { color: var(--ink-2); text-decoration: none; font-weight: 700; padding: 6px 2px; }
  .links a[aria-current='page'] { color: var(--ink); border-bottom: 2px solid var(--ink); }
  .right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .lookset { display: flex; background: var(--surface); border-radius: 12px; padding: 3px; }
  .lookset button { width: 34px; height: 30px; border: 0; border-radius: 9px; background: none; color: var(--ink-3); display: grid; place-items: center; cursor: pointer; }
  .lookset button[aria-pressed='true'] { background: var(--surface-2); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,.12); }
  .bell { position: relative; width: 40px; height: 40px; display: grid; place-items: center; color: var(--ink); }
  .badge { position: absolute; top: 3px; right: 2px; background: #E23A5F; color: #fff; border-radius: 9px; font-size: 11px; font-weight: 800; padding: 0 5px; }
  .mic { width: 44px; height: 44px; border-radius: 50%; background: var(--ink); color: var(--bg); display: grid; place-items: center; }
  .looktoggle { display: none; border: 0; background: none; cursor: pointer; padding: 0; }
  @media (max-width: 700px) { .links { display: none; } .top { gap: 8px; padding: 10px 12px; } .brand :global(.w) { font-size: 17.5px; }
    .lookset { display: none; } .looktoggle { display: grid; } .right { gap: 2px; } .bell { width: 38px; } .mic { margin-left: 4px; } }
</style>
