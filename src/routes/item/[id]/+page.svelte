<script>
  import { enhance } from '$app/forms';
  import Cover from '$lib/components/Cover.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Icon from '$lib/components/Icon.svelte';
  let { data } = $props();
  const KIND = { book: 'Book', audiobook: 'Audiobook', movie: 'Movie', tv: 'TV show', restaurant: 'Restaurant', recipe: 'Recipe' };
  let avg = $derived(data.rankedOn.length ? (data.rankedOn.reduce((s, r) => s + Math.min(r.position, 11), 0) / data.rankedOn.length).toFixed(1) : '–');
  let fromOther = $derived(data.rankedOn.find((r) => r.user_id !== data.user?.id));
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
</script>

<svelte:head><title>{data.item.title} · You Should Try</title></svelte:head>

<div class="head">
  <Cover title={data.item.title} kind={data.item.kind} w={180} />
  <div>
    <div class="cap" style="font-size:12px;color:var(--ink-2)">{KIND[data.item.kind]}{data.item.year ? ` · ${data.item.year}` : ''}</div>
    <h1 class="slab" style="font-size:clamp(34px,5vw,56px);margin:6px 0 0;line-height:1.05">{data.item.title}</h1>
    {#if data.item.creator}<p class="muted" style="font-size:18px;margin:6px 0 0">{data.item.creator}</p>{/if}
    {#if data.item.narrator}<p style="margin:8px 0 0">Read by <b>{data.item.narrator}</b>. Audiobook lists rank the performance as well as the story.</p>{/if}
    {#if data.dishes.length}<p class="script" style="font-size:28px;color:var(--green);margin:8px 0 0">get the {data.dishes[0].dish}</p>{/if}
    <div class="stats">
      <div><div class="slab big">{data.rankedOn.length}</div><div class="small muted">lists it's on</div></div>
      <div><div class="slab big">{avg}</div><div class="small muted">average spot</div></div>
    </div>
    <form method="POST" action="?/try" use:enhance>
      <input type="hidden" name="saved" value={data.saved ? '1' : '0'} />
      {#if fromOther}<input type="hidden" name="list" value={fromOther.list_id} />{/if}
      <button class="btn" class:dark={!data.saved}><Icon name="mark" size={18} />{data.saved ? 'On your try list' : 'Add to try list'}</button>
    </form>
    {#if data.tags.length}<div style="margin-top:18px"><div class="small faint">Suggested tags</div><div class="tags" style="margin-top:6px">{#each data.tags as t}<span class="tag">{t}</span>{/each}</div></div>{/if}
  </div>
</div>

{#if data.dishes.length}
  <h2 class="h2" style="margin-top:40px">What to order</h2><div class="rule"></div>
  {#each data.dishes as d}<div class="item"><span>{cap(d.dish)}</span><span class="fill"></span><span class="no">{d.n} list{d.n > 1 ? 's' : ''}</span></div>{/each}
{/if}

<h2 class="h2" style="margin-top:40px">Who ranked it</h2><div class="rule"></div>
{#each data.rankedOn as r}
  <a class="who" href="/list/{r.list_id}">
    <Avatar name={r.user_name} color={r.user_color} />
    <div style="flex:1"><div><b>{r.user_id === data.user?.id ? 'You' : r.user_name}</b> {r.user_id === data.user?.id ? 'have' : 'has'} it at <b>No. {r.position}</b> on {r.list_title}</div>
      {#if r.why}<div class="serif" style="font-style:italic;color:var(--ink-2)">“{r.why}”</div>{/if}</div>
  </a>
{:else}
  <p class="muted">Nobody has ranked this yet.</p>
{/each}

<style>
  .head { display: flex; gap: 34px; align-items: flex-start; margin-top: 32px; flex-wrap: wrap; }
  .stats { display: flex; gap: 34px; margin: 20px 0; }
  .big { font-size: 48px; line-height: 1; }
  .who { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--line); text-decoration: none; color: var(--ink); }
</style>
