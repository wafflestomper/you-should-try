<script>
  import { tick } from 'svelte';
  import { enhance } from '$app/forms';
  import Cover from '$lib/components/Cover.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Libraries from '$lib/components/Libraries.svelte';
  import RecCard from '$lib/components/RecCard.svelte';
  import { KIND_INFO } from '$lib/kinds.js';
  let { data, form } = $props();
  const HAD = { book: "I've read it", audiobook: "I've listened to it", movie: "I've seen it", tv: "I've watched it", restaurant: "I've been", recipe: "I've made it" };
  let onMyList = $derived(data.rankedOn.some((r) => r.user_id === data.user?.id));
  const wait = (h) => h.available ? (h.availableCopies > 1 ? `Available, ${h.availableCopies} copies` : 'Available now') : h.waitDays ? `About ${Math.max(1, Math.round(h.waitDays / 7))} wk wait` : 'Waitlist';
  const fmt = (h) => (h.format === 'audiobook' ? 'Audiobook' : h.kindle ? 'Ebook, Kindle OK' : 'Ebook');
  let editing = $state(false);
  let fxKind = $state(data.item.kind);
  let fxTitle = $state(data.item.title);
  let fxResults = $state([]);
  let fxPick = $state(null);
  let fxNote = $state('');
  let fxTimer;
  let fxForm;
  let fxSaving = $state(false);
  let fxOpen = $state(false);
  $effect(() => { if (form?.fixError) fxOpen = true; });
  function fxSearch() {
    clearTimeout(fxTimer);
    fxTimer = setTimeout(async () => {
      if (fxTitle.trim().length < 2) return;
      const r = await fetch(`/api/search?kind=${fxKind}&q=${encodeURIComponent(fxTitle)}`);
      const j = await r.json();
      fxResults = (j.results || []).filter((m) => m.local_id !== data.item.id);
      fxNote = j.note || (fxResults.length ? '' : 'No matches. Saving keeps what you typed.');
      fxPick = null;
    }, 350);
  }
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

{#if !['movie', 'tv', 'book', 'audiobook'].includes(data.item.kind)}
<section class="details" id="details">
  <h2 class="h2">{data.item.kind === 'recipe' ? 'The recipe' : 'Details'}</h2><div class="rule"></div>
  {#if !editing}
    {#if data.item.url}<a class="btn dark" href={data.item.url} target="_blank" rel="noopener">{data.item.kind === 'recipe' ? 'Open the recipe' : 'Open the link'} ↗</a>{/if}
    {#if data.item.details}<div class="dtext">{data.item.details}</div>{/if}
    {#if data.item.url || data.item.details}
      <p class="small muted">{data.detailsBy ? `Added by ${data.detailsBy.split(' ')[0]}. ` : ''}<button class="lnkb" onclick={() => (editing = true)}>Edit</button></p>
    {:else}
      <p class="muted">{data.item.kind === 'recipe' ? 'No recipe here yet.' : 'No link or details yet.'}</p>
      <button class="btn" onclick={() => (editing = true)}>{data.item.kind === 'recipe' ? 'Add the link or the recipe' : 'Add a link or details'}</button>
    {/if}
    {#if form?.detailsSaved}<p class="ok small">Saved.</p>{/if}
  {:else}
    <form method="POST" action="?/details" use:enhance={() => async ({ update, result }) => { await update({ reset: false }); if (result.type === 'success') editing = false; }} class="dform">
      <label for="d-link">{data.item.kind === 'recipe' ? 'Link to the recipe' : 'Link'}</label>
      <input id="d-link" name="link" type="text" inputmode="url" autocapitalize="off" value={data.item.url ?? ''} placeholder="https://" />
      <label for="d-text">{data.item.kind === 'recipe' ? 'Or type or paste the recipe' : 'Details'} <span class="small muted">(ingredients, steps, what to order…)</span></label>
      <textarea id="d-text" name="details" rows="8">{data.item.details ?? ''}</textarea>
      {#if form?.detailsError}<p class="bad2" role="alert">{form.detailsError}</p>{/if}
      <div class="drow"><button class="btn dark">Save</button><button type="button" class="lnkb" onclick={() => (editing = false)}>Cancel</button></div>
    </form>
  {/if}
</section>
{/if}

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

{#if data.canFix}
<details class="fixbox" bind:open={fxOpen}>
  <summary>Wrong thing, or added by mistake?</summary>
  <form method="POST" action="?/fix" class="fixform" bind:this={fxForm}>
    <label for="fx-kind">What is it?</label>
    <select id="fx-kind" name="kind" bind:value={fxKind} onchange={fxSearch}>
      {#each KIND_INFO as k}<option value={k.key}>{k.label}</option>{/each}
    </select>
    <label for="fx-title">Title or name</label>
    <input id="fx-title" name="title" bind:value={fxTitle} oninput={fxSearch} autocomplete="off" />
    {#if fxNote}<p class="small muted">{fxNote}</p>{/if}
    {#if fxResults.length}
      <div class="fxres" role="radiogroup" aria-label="Pick the right one">
        {#each fxResults as m, i (i)}
          <button type="button" role="radio" aria-checked={fxPick === m} class:sel={fxPick === m} onclick={async () => { fxPick = m; fxTitle = m.title; fxSaving = true; await tick(); fxForm.requestSubmit(); }}>
            <Cover title={m.title} kind={m.kind} image={m.image_url} w={36} /><span class="fxt"><b>{m.title}</b><br /><span class="small muted">{[m.creator, m.year].filter(Boolean).join(', ')}</span></span><span class="use">{fxSaving && fxPick === m ? 'Saving…' : 'Use this'}</span>
          </button>
        {/each}
      </div>
    {/if}
    <input type="hidden" name="pick" value={fxPick ? JSON.stringify(fxPick) : '{}'} />
    {#if form?.fixError}<p class="bad2" role="alert">{form.fixError}</p>{/if}
    <button class="btn dark">{fxResults.length ? 'None of these, save what I typed' : 'Save the fix'}</button>
    <p class="small muted">Tap the right one above and it saves right away. Everyone's recommendations, notes and ratings move with it.</p>
  </form>
  <div class="rmrow">
    {#if data.mineRecs}
      <form method="POST" action="?/removeMine" onsubmit={(e) => { if (!confirm('Remove your recommendation of this?')) e.preventDefault(); }}><button class="btn">Remove my recommendation</button></form>
    {/if}
    {#if data.isAdmin}
      <form method="POST" action="?/deleteCard" onsubmit={(e) => { if (!confirm('Delete this card for everyone? This removes every recommendation and rating on it.')) e.preventDefault(); }}><button class="btn danger">Delete card for everyone</button></form>
    {/if}
  </div>
</details>
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
  .fixbox { margin-top: 28px; background: var(--surface); border-radius: 16px; padding: 12px 14px; }
  .fixbox summary { font-weight: 800; cursor: pointer; min-height: 32px; display: flex; align-items: center; }
  .fixform { display: grid; gap: 6px; margin-top: 8px; }
  .fixform label { font-weight: 700; font-size: 14px; margin-top: 6px; }
  .fixform input, .fixform select { min-height: 44px; border-radius: 10px; padding: 0 10px; font: 16px Manrope, sans-serif; border: 1px solid var(--line); }
  .fxres { display: grid; gap: 6px; }
  .fxres button { display: flex; gap: 10px; align-items: center; text-align: left; padding: 8px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); font: inherit; cursor: pointer; }
  .fxres button.sel { box-shadow: inset 0 0 0 2px var(--ink); }
  .fxt { flex: 1; min-width: 0; }
  .use { flex: none; font-weight: 800; font-size: 13px; background: var(--ink); color: var(--bg); border-radius: 10px; padding: 7px 10px; }
  .rmrow { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
  .rmrow form { margin: 0; }
  .btn.danger { border-color: #B42318; color: #B42318; }
  .metoo { margin-top: 28px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .boardcard { margin-top: 18px; max-width: 640px; }
  .boardcard :global(.cov) { display: none; }
  .details { margin-top: 32px; max-width: 700px; }
  .dtext { white-space: pre-wrap; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 14px; margin: 12px 0 6px; line-height: 1.55; }
  .dform { display: grid; gap: 6px; }
  .dform label { font-weight: 700; margin-top: 8px; }
  .dform input, .dform textarea { border: 1.5px solid var(--line); border-radius: 10px; padding: 10px 12px; font: 16px var(--body); }
  .drow { display: flex; gap: 12px; align-items: center; margin-top: 8px; }
  .lnkb { background: none; border: 0; text-decoration: underline; cursor: pointer; font: inherit; color: var(--ink-2); padding: 0; }
  .bad2 { color: #B42318; font-weight: 600; }
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
