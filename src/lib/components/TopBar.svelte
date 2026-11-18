<script>
  import Logo from './Logo.svelte';
  let { path = '/', counts = {}, look = 'light', setLook = () => {} } = $props();
  const links = [['/', 'Board'], ['/mine', 'History'], ['/people', 'People']];
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
  @media (max-width: 700px) { .links { display: none; } .top { gap: 10px; } .brand :global(.w) { font-size: 17.5px; } .lookset button { width: 30px; } }
</style>
