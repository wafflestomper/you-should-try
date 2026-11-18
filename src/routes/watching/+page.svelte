<script>
  import { standing, epCode } from '$lib/tvmath.js';
  import Cover from '$lib/components/Cover.svelte';
  import RateFinish from '$lib/components/RateFinish.svelte';
  import { showToast } from '$lib/toast.svelte.js';
  import { toast } from '$lib/toast.svelte.js';
  import { invalidateAll } from '$app/navigation';
  import { tick } from 'svelte';
  import { page } from '$app/state';
  let { data } = $props();

  // Local copy so taps show instantly; the saves happen behind it
  let shows = $state(structuredClone(data.shows));
  $effect(() => { shows = structuredClone(data.shows); });

  let withState = $derived(shows.map((x) => ({ ...x, st: x.info ? standing(x.info, x.s, x.e) : null })));
  // Recent: last watched or started at the top. Fewest left: closest to done at the top (ties go to most recent).
  let sortBy = $state('recent');
  $effect(() => { try { const v = localStorage.getItem('yst_watch_sort'); if (v === 'left') sortBy = 'left'; } catch {} });
  function setSort(v) { sortBy = v; try { localStorage.setItem('yst_watch_sort', v); } catch {} }
  const recent = (a, b) => (b.at || '').localeCompare(a.at || '');
  let upNext = $derived(withState.filter((x) => x.st?.state === 'next').sort((a, b) => sortBy === 'left' ? (a.st.left - b.st.left) || recent(a, b) : recent(a, b)));
  let waiting = $derived(withState.filter((x) => x.st?.state === 'waiting').sort((a, b) => (a.st.air || '9999').localeCompare(b.st.air || '9999')));
  let finished = $derived(withState.filter((x) => x.st?.state === 'finished'));
  let unknown = $derived(withState.filter((x) => !x.st));

  const name = (x, ep) => (ep ? data.epNames[`${x.id}:${ep.s}:${ep.e}`] : null);
  function when(d) {
    if (!d) return null;
    const dt = new Date(d + 'T12:00:00'), days = Math.round((dt - new Date()) / 864e5);
    if (days <= 0) return 'today'; if (days === 1) return 'tomorrow'; if (days < 7) return dt.toLocaleDateString(undefined, { weekday: 'long' });
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  async function post(id, body) {
    const r = await fetch(`/api/tv/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error();
  }
  function watched(x) {
    const ep = x.st.ep, before = { s: x.s, e: x.e, caughtUp: x.caughtUp };
    const show = shows.find((y) => y.id === x.id);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    Object.assign(before, { at: show.at });
    show.s = ep.s; show.e = ep.e; show.caughtUp = false; show.at = now;
    showToast(`Watched ${x.title} ${epCode(ep)}.`, () => { Object.assign(show, before); post(x.id, { op: 'set', s: before.s, e: before.e }).catch(() => {}); });
    post(x.id, { op: 'set', s: ep.s, e: ep.e }).catch(() => { Object.assign(show, before); showToast(`Couldn't save ${x.title}. Try again.`); });
  }

  // Add a show that isn't being tracked yet
  let q = $state(''), results = $state([]), searching = $state(false), adding = $state(null), timer;
  let adding_open = $state(false), findEl = $state(null);
  let addOpen = $derived(adding_open || shows.length === 0);
  // The + in the bottom bar comes here with ?add=… : open the search and put the cursor in it
  let lastAdd = null;
  $effect(() => {
    const a = page.url.searchParams.get('add');
    if (a && a !== lastAdd) { lastAdd = a; adding_open = true; pick = null; tick().then(() => { findEl?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }); }
  });
  async function openAdd() {
    adding_open = !adding_open;
    if (adding_open) { await tick(); findEl?.focus(); }
    else { q = ''; results = []; }
  }
  let pick = $state(null), pickS = $state(1), pickE = $state(1);
  let pickSeasons = $derived((pick?.info?.seasons || []).filter((x) => x.n >= 1 && x.count > 0).sort((a, b) => a.n - b.n));
  function search() {
    clearTimeout(timer);
    if (q.trim().length < 2) { results = []; return; }
    timer = setTimeout(async () => {
      searching = true;
      try { results = (await (await fetch(`/api/search?kind=tv&q=${encodeURIComponent(q)}`)).json()).results.slice(0, 6); } catch { results = []; }
      searching = false;
    }, 300);
  }
  async function choose(r) {
    adding = r.source_id || r.title;
    try {
      const d = await (await fetch('/api/tv/new', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(r) })).json();
      pick = { ...d, image: r.image_url, year: r.year };
      pickS = (d.info?.seasons || []).filter((x) => x.n >= 1 && x.count > 0).map((x) => x.n).sort((a, b) => a - b)[0] ?? 1; pickE = 1;
    } catch { showToast("Couldn't add that show. Try again."); }
    adding = null;
  }
  async function start(s, e) {
    const p = pick; pick = null; q = ''; results = []; adding_open = false;
    shows = [{ id: p.id, title: p.title, year: p.year, image: p.image, s, e, caughtUp: false, at: new Date().toISOString().slice(0, 19).replace('T', ' '), info: p.info }, ...shows.filter((x) => x.id !== p.id)];
    try { await post(p.id, { op: 'set', s, e }); await invalidateAll(); } catch { showToast(`Couldn't save ${p.title}. Try again.`); }
  }
</script>

<svelte:head><title>Watching · You Should Try</title></svelte:head>

<div class="head">
  <h1>Watching</h1>
  {#if shows.length}<button class="btn addbtn" onclick={openAdd} aria-expanded={addOpen}>{addOpen ? 'Close' : '+ Add a show'}</button>{/if}
</div>

{#if addOpen || pick}
<section class="add" class:top={shows.length > 0}>
  {#if !shows.length}<h2>Keep your place in a show</h2>{/if}
  {#if !shows.length}<p class="muted">Track the shows you're watching. Each one shows the next episode, and new episodes bring it back to the top. Only you see this.</p>{/if}
  {#if pick}
    <div class="pickbox">
      <div class="ph"><Cover title={pick.title} kind="tv" image={pick.image} w={44} /><b>{pick.title}</b></div>
      {#if !pickSeasons.length}<p class="muted">Couldn't find this show's episodes.</p><button class="btn" onclick={() => (pick = null)}>Back</button>
      {:else}
        <p class="muted">How far are you?</p>
        <div class="choices">
          <button class="btn dark" onclick={() => start(pickSeasons[0].n, 0)}>Haven't started</button>
          <button class="btn" onclick={() => { const l = pick.info.last; start(l.s, l.e); }}>Watched it all</button>
        </div>
        {#if pickSeasons.length > 1}
          <p class="muted small">Watched through the end of season:</p>
          <div class="thru">{#each pickSeasons as x (x.n)}<button class="btn" onclick={() => { const l = pick.info.last; start(x.n, l && l.s === x.n ? l.e : x.count); }} aria-label="Watched through season {x.n}">{x.n}</button>{/each}</div>
        {/if}
        <p class="muted small">Or the last one you watched:</p>
        <div class="pick">
          <label>Season <select bind:value={pickS} onchange={() => (pickE = 1)}>{#each pickSeasons as x}<option value={x.n}>{x.n}</option>{/each}</select></label>
          <label>Episode <select bind:value={pickE}>{#each Array.from({ length: pickSeasons.find((x) => x.n === pickS)?.count ?? 1 }, (_, i) => i + 1) as n}<option value={n}>{n}</option>{/each}</select></label>
          <button class="btn" onclick={() => start(pickS, pickE)}>Save</button>
        </div>
        <button class="lnk" onclick={() => { pick = null; adding_open = shows.length === 0; }}>Cancel</button>
      {/if}
    </div>
  {:else}
    <input class="find" type="search" bind:this={findEl} bind:value={q} oninput={search} placeholder="Search for a TV show" aria-label="Search for a TV show" />
    {#if searching}<p class="muted small">Searching…</p>{/if}
    {#if results.length}
      <ul class="res">
        {#each results as r (r.source_id ?? r.title)}
          <li><button onclick={() => choose(r)} disabled={!!adding}>
            <Cover title={r.title} kind="tv" image={r.image_url} w={36} />
            <span><b>{r.title}</b>{r.year ? ` (${r.year})` : ''}</span>
            <span class="muted small">{adding === (r.source_id || r.title) ? 'Adding…' : shows.some((x) => x.title === r.title) ? 'Tracking' : 'Track'}</span>
          </button></li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>
{/if}

{#if toast.text}
  {#key toast.id}<div class="toast quick" role="status"><span>{toast.text}</span>{#if toast.undo}<button class="btn sm" onclick={() => { const u = toast.undo; toast.undo = null; u(); }}>Undo</button>{/if}</div>{/key}
{/if}

{#if upNext.length}
  <section>
    <div class="uh"><h2>Up next</h2>
      {#if upNext.length > 1}<div class="seg" role="group" aria-label="Sort">
        <button aria-pressed={sortBy === 'recent'} onclick={() => setSort('recent')}>Recent</button>
        <button aria-pressed={sortBy === 'left'} onclick={() => setSort('left')}>Fewest left</button></div>{/if}</div>
    <ul class="shows">
      {#each upNext as x (x.id)}
        <li class="show">
          <a href="/item/{x.id}" class="cov"><Cover title={x.title} kind="tv" image={x.image} w={54} /></a>
          <a href="/item/{x.id}" class="mid">
            <span class="t">{x.title}</span>
            <span class="nx">{epCode(x.st.ep)}{name(x, x.st.ep) ? `, ${name(x, x.st.ep)}` : ''}</span>
            <span class="left">{#if x.caughtUp}<span class="new">New episode</span>{/if}{x.st.left} left</span>
          </a>
          <button class="btn dark go" onclick={() => watched(x)} aria-label="Watched {x.title} {epCode(x.st.ep)}"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>E{x.st.ep.e}</button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if waiting.length}
  <section>
    <h2>Caught up</h2>
    <ul class="shows">
      {#each waiting as x (x.id)}
        <li class="show quiet">
          <a href="/item/{x.id}" class="cov"><Cover title={x.title} kind="tv" image={x.image} w={44} /></a>
          <a href="/item/{x.id}" class="mid"><span class="t">{x.title}</span>
            <span class="left">{x.st.ep && x.st.air ? `${epCode(x.st.ep)} comes out ${when(x.st.air)}` : x.st.air ? `Back ${when(x.st.air)}` : 'Waiting on new episodes'}</span></a>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if finished.length || unknown.length}
  <section>
    <h2>Finished</h2>
    <ul class="shows">
      {#each [...finished, ...unknown] as x (x.id)}
        <li class="show quiet fin">
          <a href="/item/{x.id}" class="cov"><Cover title={x.title} kind="tv" image={x.image} w={44} /></a>
          <div class="mid"><a href="/item/{x.id}" class="t">{x.title}</a>
            {#if x.st}<RateFinish itemId={x.id} title={x.title} onBoard={x.onBoard} compact ondone={() => (shows = shows.filter((y) => y.id !== x.id))} />
            {:else}<span class="left">Checking episodes…</span>{/if}</div>
        </li>
      {/each}
    </ul>
  </section>
{/if}



<style>
  h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 14px 0 6px; }
  .uh { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .seg { display: flex; background: var(--surface); border-radius: 12px; padding: 3px; }
  .seg button { border: 0; background: none; color: var(--ink-2); font: 700 13.5px Manrope, sans-serif; padding: 7px 12px; border-radius: 9px; cursor: pointer; }
  .seg button[aria-pressed='true'] { background: var(--surface-2); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,.12); }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .addbtn { min-height: 42px; padding: 0 16px; border-radius: 999px; white-space: nowrap; }
  .add.top { background: var(--surface); border-radius: 16px; padding: 12px; margin: 6px 0 4px; }
  .add.top .res button, .add.top .pickbox { background: var(--surface-2); }
  h2 { font-size: 17px; font-weight: 800; margin: 22px 0 8px; }
  .shows { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .show { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; background: var(--surface); border-radius: 16px; padding: 10px 12px; }
  .show.quiet { padding: 8px 12px; }
  .show.fin { grid-template-columns: auto 1fr; align-items: start; padding: 12px; }
  .show.fin .mid { gap: 8px; }
  a.t { color: var(--ink); text-decoration: none; }
  .cov { display: flex; text-decoration: none; }
  .mid { display: grid; gap: 2px; min-width: 0; text-decoration: none; color: var(--ink); }
  .t { font-weight: 800; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nx { font-size: 14.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .left { font-size: 13px; color: var(--ink-2); display: flex; align-items: center; gap: 6px; }
  .new { background: #0D9488; color: #fff; font-weight: 800; font-size: 11.5px; padding: 2px 8px; border-radius: 999px; }
  .go { min-height: 44px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; white-space: nowrap; }
  .add { margin-top: 10px; }
  .add.top { margin-top: 6px; }
  .find { width: 100%; box-sizing: border-box; min-height: 48px; border-radius: 12px; border: 1px solid var(--line); padding: 0 14px; font: 16px Manrope, sans-serif; background: var(--surface-2); color: var(--ink); }
  .res { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 4px; }
  .res button { width: 100%; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; min-height: 56px; padding: 6px 10px; border: 0; border-radius: 12px; background: var(--surface); color: var(--ink); font: 15px Manrope, sans-serif; text-align: left; cursor: pointer; }
  .pickbox { background: var(--surface); border-radius: 16px; padding: 14px; display: grid; gap: 10px; }
  .ph { display: flex; align-items: center; gap: 12px; font-size: 17px; }
  .pickbox p { margin: 0; }
  .choices { display: flex; gap: 8px; flex-wrap: wrap; }
  .choices .btn, .pick .btn { min-height: 46px; padding: 0 16px; }
  .thru { display: flex; gap: 8px; flex-wrap: wrap; }
  .thru .btn { min-width: 46px; min-height: 46px; padding: 0 12px; border-radius: 999px; }
  .pick { display: flex; gap: 10px; align-items: end; flex-wrap: wrap; }
  .pick label { display: grid; gap: 4px; font-weight: 800; font-size: 14px; }
  .pick select { min-height: 46px; min-width: 84px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); font: 16px Manrope, sans-serif; padding: 0 10px; }
  .small { font-size: 13.5px; }
  .lnk { background: none; border: 0; padding: 4px 0; font: 700 14px Manrope, sans-serif; color: var(--ink-2); text-decoration: underline; cursor: pointer; justify-self: start; }
  .toast { background: var(--surface); padding: 10px 14px; border-radius: 12px; margin: 4px 0 10px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .quick { position: sticky; top: 72px; z-index: 20; box-shadow: 0 6px 20px rgba(0,0,0,.12); animation: flash 1.1s ease-out both, leave .35s ease-in 4.65s both; }
  @keyframes flash { 0%, 25% { background: #0D9488; color: #fff; } 100% { background: var(--surface); color: var(--ink); } }
  @keyframes leave { to { opacity: 0; transform: translateY(-6px); } }
  @media (prefers-reduced-motion: reduce) { .quick { animation: none; } }
</style>
