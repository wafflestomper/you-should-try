<script>
  import Avatar from '$lib/components/Avatar.svelte';
  let { data } = $props();
</script>
<svelte:head><title>People · You Should Try</title></svelte:head>
<h1 class="slab" style="font-size:48px;margin:32px 0 0">Your people</h1>
<p class="muted" style="margin:6px 0 0">Sorted by taste match. The network map comes in a later update.</p>
<div class="rule" style="margin-top:16px"></div>
{#each data.people as p}
  <a class="row" href="/people/{p.id}"><Avatar name={p.name} color={p.color} /><div style="flex:1"><b>{p.name}</b><div class="small muted">{p.circles ?? ''}</div></div>
    <span class={p.pct == null ? 'small faint' : 'slab'} style={p.pct == null ? '' : 'font-size:24px'}>{p.pct == null ? 'Not enough overlap yet' : `${p.pct}%`}</span></a>
{/each}
<style>.row { display: flex; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); color: var(--ink); text-decoration: none; }</style>
