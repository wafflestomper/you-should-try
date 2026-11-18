<script>
  let { path = '/', counts = {} } = $props();
  const links = [['/', 'Board'], ['/mine', 'History'], ['/people', 'People']];
  const on = (h) => (h === '/' ? path === '/' : path.startsWith(h));
</script>

<header class="top">
  <a href="/" class="brand">You Should Try…</a>
  <nav aria-label="Main" class="links">
    {#each links as [href, label]}<a {href} aria-current={on(href) ? 'page' : undefined}>{label}</a>{/each}
  </nav>
  <a href="/notes" class="bell" aria-label="Notifications, {counts.unread || 0} new">🔔{#if counts.unread}<span class="badge">{counts.unread}</span>{/if}</a>
  <a href="/add" class="btn dark add">+ You should try</a>
</header>

<style>
  .top { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 18px; padding: 10px 16px; background: #fff; border-bottom: 1px solid #E6E5E0; }
  .brand { font-weight: 800; font-size: 18px; color: var(--ink); text-decoration: none; margin-right: 8px; }
  .links { display: flex; gap: 16px; }
  .links a { color: var(--ink-2); text-decoration: none; font-weight: 600; padding: 6px 2px; }
  .links a[aria-current='page'] { color: var(--ink); border-bottom: 2px solid var(--accent); }
  .bell { margin-left: auto; position: relative; text-decoration: none; font-size: 20px; width: 40px; height: 40px; display: grid; place-items: center; }
  .badge { position: absolute; top: 2px; right: 0; background: #C2410C; color: #fff; border-radius: 9px; font-size: 11px; font-weight: 800; padding: 0 5px; }
  .add { min-height: 40px; }
  @media (max-width: 700px) { .links, .add { display: none; } }
</style>
