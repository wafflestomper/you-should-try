<script>
  // Episode tracking on a TV show's page. Everything updates on tap; the save happens behind it.
  import { nextAfter, aired, standing, prevOf, epCode } from '$lib/tvmath.js';
  import RateFinish from './RateFinish.svelte';
  let { itemId } = $props();

  let info = $state(null), progress = $state(null), loaded = $state(false), failed = $state(false), onBoard = $state(false), title = $state(''), rated = $state(null);
  let picking = $state(false), pickS = $state(1), pickE = $state(1);
  let openSeason = $state(null), episodes = $state({}), msg = $state('');

  let seasons = $derived((info?.seasons || []).filter((x) => x.n >= 1 && x.count > 0).sort((a, b) => a.n - b.n));
  let st = $derived(info && progress ? standing(info, progress.s, progress.e) : null);
  let pickCount = $derived(seasons.find((x) => x.n === pickS)?.count ?? 1);

  $effect(() => {
    const id = itemId;
    loaded = false;
    fetch(`/api/tv/${id}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => {
      info = d.info; progress = d.progress; onBoard = d.onBoard; title = d.title; loaded = true;
      // The pickers start at the very beginning: Season 1, Episode 1
      pickS = (d.info?.seasons || []).filter((x) => x.n >= 1 && x.count > 0).map((x) => x.n).sort((a, b) => a - b)[0] ?? 1; pickE = 1;
    }).catch(() => { failed = true; loaded = true; });
  });

  async function save(body, before) {
    try {
      const r = await fetch(`/api/tv/${itemId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
    } catch {
      progress = before; msg = "That didn't save. Check your connection and try again.";
    }
  }
  function setTo(s, e) { const before = progress; progress = { s, e }; msg = ''; picking = false; save({ op: 'set', s, e }, before); }
  function watchedNext() { if (st?.ep) setTo(st.ep.s, st.ep.e); }
  function allOfIt() { const l = info?.last; if (l) setTo(l.s, l.e); }
  function stop() { const before = progress; progress = null; save({ op: 'stop' }, before); }

  const watched = (s, e) => progress && (s < progress.s || (s === progress.s && e <= progress.e));
  function toggle(s, e) {
    if (watched(s, e)) { const p = prevOf(info, s, e); setTo(p.s, p.e); } else setTo(s, e);
  }
  function seasonDone(n) {
    const x = seasons.find((y) => y.n === n);
    const lastOut = info.last && info.last.s === n ? info.last.e : x.count;
    setTo(n, lastOut);
  }
  function watchedIn(n) {
    if (!progress) return 0;
    const x = seasons.find((y) => y.n === n);
    return progress.s > n ? x.count : progress.s === n ? Math.min(progress.e, x.count) : 0;
  }
  async function toggleSeason(n) {
    openSeason = openSeason === n ? null : n;
    if (openSeason != null && !episodes[n]) {
      episodes[n] = 'loading';
      try { const d = await (await fetch(`/api/tv/${itemId}?season=${n}`)).json(); episodes[n] = d.episodes; }
      catch { episodes[n] = []; }
    }
  }
  function when(d) {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: dt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  }
  const isOut = (s, e, ep) => aired(info, { s, e }) || (ep?.air && ep.air <= new Date().toISOString().slice(0, 10));
</script>

<section class="tvp">
  <h2 class="h2">Your episodes</h2><div class="rule"></div>
  {#if !loaded}
    <p class="muted">Getting the episode list…</p>
  {:else if failed || !info || !seasons.length}
    <p class="muted">Couldn't find this show's episodes. If it's the wrong show, use "Wrong thing?" below to pick the right one.</p>
  {:else if rated}
    <p class="lead">{rated === 'loved' ? 'You loved it.' : rated === 'liked' ? 'You liked it.' : 'Not for you. Noted.'} It's in your History.</p>
  {:else if !progress}
    {#if !picking}
      <p class="lead">Keep your place in this show. It goes on your Watching tab, and only you see it.</p>
      <div class="choices">
        <button class="btn dark" onclick={() => setTo(seasons[0].n, 0)}>Haven't started</button>
        <button class="btn" onclick={() => (picking = true)}>Watched some</button>
        <button class="btn" onclick={allOfIt}>Watched it all</button>
      </div>
      {#if seasons.length > 1}
        <p class="muted small thru-l">Or watched through the end of season:</p>
        <div class="thru">{#each seasons as x (x.n)}<button class="btn" onclick={() => setTo(x.n, info.last && info.last.s === x.n ? info.last.e : x.count)} aria-label="Watched through season {x.n}">{x.n}</button>{/each}</div>
      {/if}
    {:else}
      <p class="lead">What's the last episode you watched?</p>
      <div class="pick">
        <label>Season
          <select bind:value={pickS} onchange={() => (pickE = 1)}>{#each seasons as x}<option value={x.n}>{x.n}</option>{/each}</select></label>
        <label>Episode
          <select bind:value={pickE}>{#each Array.from({ length: pickCount }, (_, i) => i + 1) as n}<option value={n}>{n}</option>{/each}</select></label>
      </div>
      <div class="choices">
        <button class="btn dark" onclick={() => setTo(pickS, pickE)}>Save my place</button>
        <button class="btn" onclick={() => (picking = false)}>Cancel</button>
      </div>
    {/if}
  {:else}
    <div class="now">
      {#if st.state === 'next'}
        <div><b>Up next: {epCode(st.ep)}</b><div class="muted small">{st.left} left to watch</div></div>
        <button class="btn dark" onclick={watchedNext}>Watched {epCode(st.ep).split(' ')[1]}</button>
      {:else if st.state === 'waiting'}
        <div><b>You're caught up.</b><div class="muted small">{st.ep ? `${epCode(st.ep)} ` : 'More '}{st.air ? `comes out ${when(st.air)}.` : 'hasn\'t been scheduled yet.'}</div></div>
      {:else}
        <RateFinish {itemId} {title} {onBoard} ondone={(r) => { rated = r; progress = null; }} />
      {/if}
    </div>
    {#if msg}<p class="err" role="alert">{msg}</p>{/if}

    <ul class="seasons">
      {#each seasons as x (x.n)}
        {@const w = watchedIn(x.n)}
        <li>
          <button class="srow" onclick={() => toggleSeason(x.n)} aria-expanded={openSeason === x.n}>
            <span><b>Season {x.n}</b> <span class="muted small">{x.count} episodes</span></span>
            <span class="count" class:full={w === x.count}>{w === x.count ? 'Watched' : w ? `${w} of ${x.count}` : ''}</span>
          </button>
          {#if openSeason === x.n}
            <div class="eps">
              {#if w < x.count}<button class="lnk" onclick={() => seasonDone(x.n)}>Mark season {x.n} watched</button>{/if}
              {#if episodes[x.n] === 'loading'}<p class="muted small">Loading episodes…</p>{/if}
              {#each Array.from({ length: x.count }, (_, i) => i + 1) as e}
                {@const ep = Array.isArray(episodes[x.n]) ? episodes[x.n].find((y) => y.e === e) : null}
                {@const out = isOut(x.n, e, ep)}
                <button class="ep" class:on={watched(x.n, e)} disabled={!out && !watched(x.n, e)} onclick={() => toggle(x.n, e)} aria-pressed={!!watched(x.n, e)}>
                  <span class="tick" aria-hidden="true">{#if watched(x.n, e)}<svg width="14" height="14" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>{/if}</span>
                  <span class="et"><b>{e}</b>{ep?.name ? ` ${ep.name}` : ''}</span>
                  <span class="muted small">{out ? '' : ep?.air ? when(ep.air) : 'Not out yet'}</span>
                </button>
              {/each}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
    <button class="lnk stop" onclick={stop}>Stop tracking this show</button>
  {/if}
</section>

<style>
  .tvp { margin: 22px 0; }
  .lead { margin: 0 0 12px; color: var(--ink-2); }
  .choices { display: flex; gap: 8px; flex-wrap: wrap; }
  .choices .btn { min-height: 46px; padding: 0 16px; }
  .pick { display: flex; gap: 12px; margin-bottom: 12px; }
  .thru-l { margin: 14px 0 6px; }
  .thru { display: flex; gap: 8px; flex-wrap: wrap; }
  .thru .btn { min-width: 46px; min-height: 46px; padding: 0 12px; border-radius: 999px; }
  .pick label { display: grid; gap: 4px; font-weight: 800; font-size: 14px; }
  .pick select { min-height: 46px; min-width: 96px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); font: 16px Manrope, sans-serif; padding: 0 10px; }
  .now { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--surface); border-radius: 16px; padding: 14px 16px; }
  .now .btn { min-height: 46px; padding: 0 18px; white-space: nowrap; }
  .small { font-size: 13.5px; }
  .seasons { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 6px; }
  .srow { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; min-height: 52px; padding: 0 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface-2); color: var(--ink); font: 15.5px Manrope, sans-serif; cursor: pointer; text-align: left; }
  .count { font-weight: 800; font-size: 13.5px; color: var(--ink-2); }
  .count.full { color: #0B6E66; }
  :global(.look-dark) .count.full { color: #5EEAD4; }
  .eps { display: grid; gap: 2px; padding: 6px 2px 10px; }
  .ep { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 10px; min-height: 46px; padding: 0 10px; border: 0; border-radius: 10px; background: none; color: var(--ink); font: 15px Manrope, sans-serif; text-align: left; cursor: pointer; }
  .ep:disabled { color: var(--ink-3); cursor: default; }
  .tick { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--line); display: grid; place-items: center; }
  .ep.on .tick { background: #0D9488; border-color: #0D9488; color: #fff; }
  .et { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lnk { background: none; border: 0; padding: 8px 2px; font: 700 14px Manrope, sans-serif; color: var(--ink); text-decoration: underline; cursor: pointer; justify-self: start; }
  .stop { margin-top: 8px; color: var(--ink-2); }
  .err { color: #B42318; font-weight: 700; }
</style>
