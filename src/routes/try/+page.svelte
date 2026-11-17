<script>
  import { enhance } from '$app/forms';
  import Cover from '$lib/components/Cover.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Libraries from '$lib/components/Libraries.svelte';
  let { data } = $props();
  const KIND = { book: 'Book', audiobook: 'Audiobook', movie: 'Movie', tv: 'TV', restaurant: 'Restaurant', recipe: 'Recipe' };
  const DONE = { book: 'Finished it', audiobook: 'Listened', movie: 'Watched it', tv: 'Watched it', restaurant: 'Been there', recipe: 'Made it' };
  const filters = [['all', 'All'], ['book', 'Books'], ['audiobook', 'Audiobooks'], ['movie', 'Movies'], ['tv', 'TV'], ['restaurant', 'Restaurants'], ['recipe', 'Recipes']];
  import { page } from '$app/state';
  let kind = $state('all');
  const doneMsg = { loved: 'Glad it was a good one. Marked done.', fine: 'Marked done.', not_for_me: 'Marked done. Only you can see how it went.' };
  let toast = $derived(page.url.searchParams.get('done') ? doneMsg[page.url.searchParams.get('r')] ?? 'Marked done.' : null);
  let shown = $derived(kind === 'all' ? data.items : data.items.filter((i) => i.kind === kind));
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
</script>

<svelte:head><title>Your try list · You Should Try</title></svelte:head>

<h1 style="margin:32px 0 0;font-weight:400"><span class="script" style="font-size:44px">your</span> <span class="slab" style="font-size:52px">TRY LIST</span></h1>
<p class="muted" style="margin:6px 0 0">Everything people said you should try, who said it, and where you can get it tonight.</p>
<Libraries libs={data.libs} />
{#if !data.libs.length}<p class="small muted" style="margin:0">Add the libraries you use in Libby and books show whether you can borrow them right now.</p>{/if}

<div class="chips" role="group" aria-label="Filter by type">
  {#each filters as [k, label]}
    <button type="button" class="chip" aria-pressed={kind === k} onclick={() => (kind = k)}>{label}</button>
  {/each}
</div>

{#if toast}<p class="toast-line" role="status">{toast}</p>{/if}
<div class="rule"></div>
<ul class="rows">
  {#each shown as t (t.item_id)}
    <li>
      <Cover title={t.title} kind={t.kind} image={t.image_url} w={52} />
      <div class="info"><div class="kind">{KIND[t.kind]}</div>
        <a class="serif it" href="/item/{t.item_id}">{t.dish ? `${cap(t.dish)}, ${t.title}` : t.title}</a>
        <div class="small muted">{t.creator ?? ''}{t.narrator ? ` · read by ${t.narrator}` : ''}</div>
        {#await data.where}
          {#if ['movie', 'tv'].includes(t.kind) || (['book', 'audiobook'].includes(t.kind) && data.libs.length)}<div class="get checking">Checking where to get it…</div>{/if}
        {:then lines}
          {#if lines[t.item_id]}<div class="get" class:ok={lines[t.item_id].ok}>{lines[t.item_id].text}</div>{/if}
        {/await}</div>
      {#if t.from_name}<div class="from"><Avatar name={t.from_name} color={t.from_color} size={28} /><span class="small">{#if t.from_rank}{t.from_name.split(' ')[0]}'s <b>No. {t.from_rank}</b>{:else}{t.from_name.split(' ')[0]} <b>sent it to you</b>{/if}</span></div>{/if}
      <div class="acts">
        <a class="btn sm dark" href="/try/{t.item_id}/done">{DONE[t.kind]}</a>
        <form method="POST" action="?/remove" use:enhance><input type="hidden" name="item" value={t.item_id} /><button class="btn sm" style="border-color:#CFCDC4">Remove</button></form>
      </div>
    </li>
  {:else}
    <li class="muted">Nothing here yet. Tap Try it on anyone's list and it lands here.</li>
  {/each}
</ul>
{#if data.items.some((t) => ['movie', 'tv'].includes(t.kind))}<p class="credit">Streaming info from <a href="https://www.justwatch.com" rel="noopener">JustWatch</a>, through TMDB.</p>{/if}

<style>
  .credit { margin: 18px 0 0; font-size: 13px; color: var(--ink-3); }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 22px 0 14px; }
  .chip { min-height: 36px; padding: 0 14px; border-radius: 18px; border: 1.5px solid #CFCDC4; font: 600 14px var(--body); background: #fff; cursor: pointer; }
  .chip[aria-pressed='true'] { background: var(--slate); color: var(--chalk); border-color: var(--slate); }
  .rows { list-style: none; margin: 0; padding: 0; }
  .rows li { display: flex; gap: 18px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
  .info { flex: 2 1 240px; min-width: 0; }
  .it { font-size: 19px; font-weight: 700; color: var(--ink); text-decoration: none; }
  .from { flex: 1 1 160px; display: flex; align-items: center; gap: 8px; }
  .acts { display: flex; gap: 8px; }
  .get { margin-top: 4px; font: 600 14px var(--body); color: var(--ink-2); }
  .get.ok { color: var(--ok); }
  .get.ok::before { content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 4px; background: var(--ok); margin-right: 7px; vertical-align: 1px; }
  .get.checking { font-weight: 400; color: var(--ink-3); }
  .toast-line { margin: 0 0 8px; font-weight: 600; color: var(--ok); }
  .btn[disabled] { opacity: .5; cursor: not-allowed; }
</style>
