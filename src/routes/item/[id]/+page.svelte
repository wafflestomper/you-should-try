<script>
  import { enhance } from '$app/forms';
  import Cover from '$lib/components/Cover.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Libraries from '$lib/components/Libraries.svelte';
  import RecCard from '$lib/components/RecCard.svelte';
  let { data, form } = $props();
  const HAD = { book: "I've read it", audiobook: "I've listened to it", movie: "I've seen it", tv: "I've watched it", restaurant: "I've been", recipe: "I've made it" };
  let onMyList = $derived(data.rankedOn.some((r) => r.user_id === data.user?.id));
  const wait = (h) => h.available ? (h.availableCopies > 1 ? `Available, ${h.availableCopies} copies` : 'Available now') : h.waitDays ? `About ${Math.max(1, Math.round(h.waitDays / 7))} wk wait` : 'Waitlist';
  const fmt = (h) => (h.format === 'audiobook' ? 'Audiobook' : h.kindle ? 'Ebook, Kindle OK' : 'Ebook');
  let to = $state('');
  let note = $state('');
  const KIND = { book: 'Book', audiobook: 'Audiobook', movie: 'Movie', tv: 'TV show', restaurant: 'Restaurant', recipe: 'Recipe' };
  let avg = $derived(data.rankedOn.length ? (data.rankedOn.reduce((s, r) => s + Math.min(r.position, 11), 0) / data.rankedOn.length).toFixed(1) : '–');
  let fromOther = $derived(data.rankedOn.find((r) => r.user_id !== data.user?.id));
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
</script>

<svelte:head><title>{data.item.title} · You Should Try</title></svelte:head>

<div class="head">
  <Cover title={data.item.title} kind={data.item.kind} image={data.item.image_url} w={180} />
  <div>
    <div class="cap" style="font-size:12px;color:var(--ink-2)">{KIND[data.item.kind]}{data.item.year ? ` · ${data.item.year}` : ''}</div>
    <h1 class="slab" style="font-size:clamp(34px,5vw,56px);margin:6px 0 0;line-height:1.05">{data.item.title}</h1>
    {#if data.item.creator}<p class="muted" style="font-size:18px;margin:6px 0 0">{data.item.creator}</p>{/if}
    {#if data.item.narrator}<p style="margin:8px 0 0">Read by <b>{data.item.narrator}</b>. Audiobook lists rank the performance as well as the story.</p>{/if}
    {#if data.dishes.length}<p class="script" style="font-size:28px;color:var(--green);margin:8px 0 0">get the {data.dishes[0].dish}</p>{/if}
    <div class="boardcard">
      {#if data.card}<RecCard card={data.card} />{:else}<p class="muted">Nobody has put this on the board yet.</p>{/if}
    </div>
    {#if data.tags.length}<div style="margin-top:18px"><div class="small faint">Suggested tags</div><div class="tags" style="margin-top:6px">{#each data.tags as t}<span class="tag">{t}</span>{/each}</div></div>{/if}
  </div>
</div>

{#if ['movie', 'tv', 'book', 'audiobook'].includes(data.item.kind)}
<section class="where">
  <h2 class="h2">Where to get it</h2><div class="rule"></div>
  {#if ['movie', 'tv'].includes(data.item.kind)}
    {#if !data.hasTmdb}<p class="muted">Streaming info turns on once the TMDB key is added.</p>
    {:else}
      {#await data.where}<p class="muted">Checking streaming services…</p>
      {:then w}
        {#if !w?.stream}<p class="muted">{w?.stream === null ? 'Not streaming, renting or for sale in the US right now.' : "Couldn't check right now. Reload in a minute."}</p>
        {:else}
          {#each [['stream', 'Streaming'], ['free', 'Free'], ['rent', 'Rent'], ['buy', 'Buy']] as [k, label]}
            {#if w.stream[k]?.length}
              <div class="prov"><span class="pl">{label}</span>
                <div class="logos">{#each w.stream[k] as p (p.name)}<span class="logo" title={p.name}>{#if p.logo}<img src={p.logo} alt={p.name} width="40" height="40" loading="lazy" />{:else}{p.name}{/if}</span>{/each}</div>
              </div>
            {/if}
          {/each}
          {#if !['stream', 'free', 'rent', 'buy'].some((k) => w.stream[k]?.length)}<p class="muted">Not streaming in the US right now.</p>{/if}
          <p class="credit">{#if w.stream.link}<a href={w.stream.link} rel="noopener" target="_blank">See all options</a>.{" "}{/if}Streaming info from <a href="https://www.justwatch.com" rel="noopener" target="_blank">JustWatch</a>, through TMDB.</p>
        {/if}
      {/await}
    {/if}
  {:else}
    <Libraries libs={data.libs} compact />
    {#if !data.libs.length}<p class="muted small">Add the libraries you use in Libby to see if you can borrow it now.</p>
    {:else}
      {#await data.where}<p class="muted">Checking your libraries…</p>
      {:then w}
        {#each w?.libs ?? [] as r (r.lib.key)}
          <div class="lib">
            <div class="ln">{r.lib.name}</div>
            {#if r.hits == null}<div class="muted small">Couldn't check right now. <a href={r.search} target="_blank" rel="noopener">Search in Libby</a></div>
            {:else if !r.hits.length}<div class="muted small">Not in this library's Libby collection. <a href={r.search} target="_blank" rel="noopener">Search anyway</a></div>
            {:else}
              {#each r.hits as h}
                <a class="hit" href={h.url ?? r.search} target="_blank" rel="noopener">
                  <span>{fmt(h)}{h.available ? '' : `, ${h.holds} holds on ${h.copies} ${h.copies === 1 ? 'copy' : 'copies'}`}</span>
                  <span class="stamp" class:ok={h.available}>{wait(h)}</span>
                </a>
              {/each}
            {/if}
          </div>
        {/each}
      {/await}
    {/if}
  {/if}
</section>
{/if}

<form method="POST" action="?/metoo" use:enhance class="metoo">
  {#if data.card?.recs.some((r) => r.by_user_id === data.user?.id)}
    <p class="muted">You recommended this.</p>
  {:else}
    <button class="btn">👍 I recommend it too</button>
    <span class="small muted">Adds your name to it on the board.</span>
  {/if}
</form>

<style>
  .head { display: flex; gap: 34px; align-items: flex-start; margin-top: 32px; flex-wrap: wrap; }
  .stats { display: flex; gap: 34px; margin: 20px 0; }
  .big { font-size: 48px; line-height: 1; }
  .metoo { margin-top: 28px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .boardcard { margin-top: 18px; max-width: 640px; }
  .boardcard :global(.cov) { display: none; }
  .where { margin-top: 40px; }
  .prov { display: flex; gap: 16px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); }
  .pl { width: 90px; font: 600 14px var(--body); }
  .logos { display: flex; gap: 8px; flex-wrap: wrap; }
  .logo { display: inline-flex; align-items: center; min-height: 40px; font-size: 13px; }
  .logo:not(:has(img)) { padding: 0 10px; border: 1px solid var(--line); border-radius: 8px; }
  .logo img { border-radius: 8px; display: block; }
  .credit { font-size: 13px; color: var(--ink-3); margin: 10px 0 0; }
  .lib { padding: 12px 0; border-bottom: 1px solid var(--line); }
  .ln { font-weight: 700; margin-bottom: 4px; }
  .hit { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 6px 0; color: var(--ink); text-decoration: none; }
  .hit:hover span:first-child { text-decoration: underline; }
  .stamp { font: 600 13px var(--body); padding: 3px 10px; border-radius: 12px; background: #F3E6CF; color: var(--wait); white-space: nowrap; }
  .stamp.ok { background: #DDEFE3; color: var(--ok); }
  .acts { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .send { margin-top: 40px; padding: 22px 24px; background: var(--slate); color: var(--chalk); border-radius: 4px; }
  .send .muted { color: var(--chalk-2); }
  .send form { display: flex; gap: 10px; flex-wrap: wrap; }
  .send select, .send input { min-height: 44px; padding: 0 12px; border-radius: 4px; border: 1.5px solid var(--chalk-2); font: 15px var(--body); background: var(--chalk); color: var(--ink); }
  .send input { flex: 1 1 260px; }
  .send .btn.dark { background: var(--chalk-yellow); color: var(--slate); border-color: var(--chalk-yellow); }
  .send .btn[disabled] { opacity: .55; cursor: not-allowed; }
  .ok { color: var(--chalk-yellow); font-weight: 600; margin: 10px 0 0; }
  .bad { color: #FFB4A8; font-weight: 600; margin: 10px 0 0; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .who { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--line); text-decoration: none; color: var(--ink); }
</style>
