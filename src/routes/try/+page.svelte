<script>
  import { enhance } from '$app/forms';
  import Cover from '$lib/components/Cover.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  let { data } = $props();
  const KIND = { book: 'Book', audiobook: 'Audiobook', movie: 'Movie', tv: 'TV', restaurant: 'Restaurant', recipe: 'Recipe' };
  const DONE = { book: 'Finished it', audiobook: 'Listened', movie: 'Watched it', tv: 'Watched it', restaurant: 'Been there', recipe: 'Made it' };
  const filters = [['all', 'All'], ['book', 'Books'], ['audiobook', 'Audiobooks'], ['movie', 'Movies'], ['tv', 'TV'], ['restaurant', 'Restaurants'], ['recipe', 'Recipes']];
  let kind = $state('all');
  let shown = $derived(kind === 'all' ? data.items : data.items.filter((i) => i.kind === kind));
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
</script>

<svelte:head><title>Your try list · You Should Try</title></svelte:head>

<h1 style="margin:32px 0 0;font-weight:400"><span class="script" style="font-size:44px">your</span> <span class="slab" style="font-size:52px">TRY LIST</span></h1>
<p class="muted" style="margin:6px 0 0">Everything people said you should try, and who said it. Where to get each one comes in a later update.</p>

<div class="chips" role="group" aria-label="Filter by type">
  {#each filters as [k, label]}
    <button type="button" class="chip" aria-pressed={kind === k} onclick={() => (kind = k)}>{label}</button>
  {/each}
</div>

<div class="rule"></div>
<ul class="rows">
  {#each shown as t (t.item_id)}
    <li>
      <Cover title={t.title} kind={t.kind} w={52} />
      <div class="info"><div class="kind">{KIND[t.kind]}</div>
        <a class="serif it" href="/item/{t.item_id}">{t.dish ? `${cap(t.dish)}, ${t.title}` : t.title}</a>
        <div class="small muted">{t.creator ?? ''}{t.narrator ? ` · read by ${t.narrator}` : ''}</div></div>
      {#if t.from_name}<div class="from"><Avatar name={t.from_name} color={t.from_color} size={28} /><span class="small">{t.from_name.split(' ')[0]}'s <b>No. {t.from_rank}</b></span></div>{/if}
      <div class="acts">
        <button type="button" class="btn sm" disabled title="Coming in the next update">{DONE[t.kind]}</button>
        <form method="POST" action="?/remove" use:enhance><input type="hidden" name="item" value={t.item_id} /><button class="btn sm" style="border-color:#CFCDC4">Remove</button></form>
      </div>
    </li>
  {:else}
    <li class="muted">Nothing here yet. Tap Try it on anyone's list and it lands here.</li>
  {/each}
</ul>

<style>
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 22px 0 14px; }
  .chip { min-height: 36px; padding: 0 14px; border-radius: 18px; border: 1.5px solid #CFCDC4; font: 600 14px var(--body); background: #fff; cursor: pointer; }
  .chip[aria-pressed='true'] { background: var(--slate); color: var(--chalk); border-color: var(--slate); }
  .rows { list-style: none; margin: 0; padding: 0; }
  .rows li { display: flex; gap: 18px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
  .info { flex: 2 1 240px; min-width: 0; }
  .it { font-size: 19px; font-weight: 700; color: var(--ink); text-decoration: none; }
  .from { flex: 1 1 160px; display: flex; align-items: center; gap: 8px; }
  .acts { display: flex; gap: 8px; }
  .btn[disabled] { opacity: .5; cursor: not-allowed; }
</style>
