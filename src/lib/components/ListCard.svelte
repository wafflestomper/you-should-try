<script>
  import Avatar from './Avatar.svelte';
  let { l } = $props();
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
</script>

<a class="lc" href="/list/{l.id}">
  <div class="slab t">{l.title}</div>
  <div class="cap s">{l.subtitle}</div>
  {#each l.top as e}
    <div class="item"><span>{e.dish ? `${cap(e.dish)}, ${e.title}` : e.title}</span><span class="fill"></span><span class="no">No. {e.position}</span></div>
  {/each}
  <div class="by"><Avatar name={l.owner_name} color={l.owner_color} size={26} />{l.owner_name}<span class="faint">· {l.ranked} ranked</span></div>
</a>

<style>
  .lc { display: block; text-decoration: none; color: var(--ink); border-top: 3px solid var(--ink); padding-top: 12px; }
  .lc:hover .t { text-decoration: underline; }
  .t { font-size: 24px; line-height: 1.1; }
  .s { font-size: 11.5px; color: var(--ink-2); margin: 6px 0 4px; }
  .item { font-size: 15.5px; padding: 4px 0; }
  .by { display: flex; align-items: center; gap: 8px; font-size: 13.5px; margin-top: 8px; }
</style>
