<script>
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import Cover from './Cover.svelte';
  import Faceoff from './Faceoff.svelte';
  import { normTag, MAX_TAGS, KIND, KIND_PLURAL } from '$lib/tags.js';

  let { categories, initial = null, form = null, preset = null } = $props();

  const start = initial ?? { category_id: preset ?? categories[0]?.id ?? null, custom_subtitle: '', kind: 'book', title: '', tags: [], entries: [] };
  let catId = $state(start.category_id);
  let customSub = $state(start.custom_subtitle);
  let customKind = $state(start.category_id ? 'book' : start.kind);
  let title = $state(start.title);
  let tags = $state([...start.tags]);
  let moreTags = $state(start.tags.length > 3);
  let entries = $state(start.entries.map((e) => ({ ...e })));
  let saving = $state(false);

  let cat = $derived(categories.find((c) => c.id === catId) ?? null);
  let kind = $derived(cat ? cat.kind : customKind);
  let searchKind = $state(start.kind === 'mixed' || cat?.kind === 'mixed' ? 'restaurant' : null);
  let activeKind = $derived(kind === 'mixed' ? searchKind || 'restaurant' : kind);
  let subtitle = $derived('Top 10 ' + (cat ? cat.name : customSub || '…'));
  let top = $derived(entries.slice(0, 10));
  let bench = $derived(entries.slice(10));

  // ---- tags ----
  let tagInfo = $state({ tags: [], merges: {}, map: {} });
  onMount(async () => {
    try { tagInfo = await (await fetch('/api/tags')).json(); } catch { /* suggestions just stay empty */ }
  });
  let tagInput = $state('');
  let maxTags = $derived(moreTags ? MAX_TAGS : 3);
  let tagMatches = $derived.by(() => {
    const raw = tagInput.trim();
    if (!raw) return [];
    const q = normTag(raw, tagInfo.merges);
    const opts = tagInfo.tags.filter((t) => t.tag.includes(q) && !tags.includes(t.tag)).slice(0, 6).map((t) => ({ tag: t.tag, note: `${t.n} list${t.n > 1 ? 's' : ''}` }));
    if (q && q !== normTag(raw) && !opts.some((o) => o.tag === q)) opts.unshift({ tag: q, note: `“${raw}” means this` });
    if (q && !opts.some((o) => o.tag === q)) opts.push({ tag: q, note: 'new tag' });
    return opts;
  });
  let suggestions = $derived.by(() => {
    const count = {};
    for (const e of entries) {
      const seen = new Set();
      for (const l of e.item.labels || []) {
        const t = tagInfo.map[String(l).toLowerCase()];
        if (t && !seen.has(t)) { seen.add(t); count[t] = (count[t] || 0) + 1; }
      }
    }
    return Object.entries(count).filter(([t]) => !tags.includes(t)).sort((a, b) => b[1] - a[1]).slice(0, 6);
  });
  function addTag(t) {
    t = normTag(t, tagInfo.merges);
    if (!t || tags.includes(t)) { tagInput = ''; return; }
    if (tags.length >= maxTags) {
      if (!moreTags) moreTags = true;
      else return note('Five tags max. Remove one first.');
    }
    tags = [...tags, t];
    tagInput = '';
  }

  // ---- search ----
  let query = $state('');
  let results = $state([]);
  let searchNote = $state(null);
  let searching = $state(false);
  let timer;
  function onQuery() {
    clearTimeout(timer);
    const q = query.trim();
    if (q.length < 2) { results = []; searchNote = null; return; }
    timer = setTimeout(async () => {
      searching = true;
      try {
        const res = await fetch(`/api/search?kind=${activeKind}&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (q === query.trim()) { results = data.results; searchNote = data.note; }
      } catch { searchNote = 'Search did not answer. Try again in a moment.'; }
      searching = false;
    }, 300);
  }

  // ---- adding by hand ----
  let manual = $state({ title: '', creator: '', extra: '', dish: '' });
  let showManual = $state(false);
  function addManual() {
    if (!manual.title.trim()) return note('Give it a name first.');
    const k = activeKind;
    const item = { kind: k, title: manual.title.trim(), creator: manual.creator.trim() || null, labels: [] };
    if (k === 'restaurant') item.city = manual.extra.trim() || null;
    else if (k === 'recipe') item.url = manual.extra.trim() || null;
    else if (k === 'audiobook') item.narrator = manual.extra.trim() || null;
    else item.year = Number(manual.extra) || null;
    addItem(item, manual.dish.trim());
    manual = { title: '', creator: '', extra: '', dish: '' };
    showManual = false;
  }

  // ---- placing items ----
  let facing = $state(null);
  let msg = $state(null);
  let fresh = $state(null);
  function note(m) { msg = m; setTimeout(() => { if (msg === m) msg = null; }, 3200); }
  const keyOf = (it) => it.local_id || (it.source && it.source_id ? `${it.source}|${it.source_id}` : `m|${it.kind}|${it.title}`);
  function addItem(item, dish = '') {
    if (entries.some((e) => keyOf(e.item) === keyOf(item))) return note(`${item.title} is already on your list.`);
    query = ''; results = [];
    const entry = { item, why: '', dish };
    if (!entries.length) { entries = [entry]; flashRow(item); return; }
    facing = entry;
  }
  function place(i) {
    const e = facing; facing = null;
    if (i < 0) {
      entries = [...entries.slice(0, 10), e, ...entries.slice(10)];
      note(`${e.item.title} lost to your No. 10. It's in your honorable mentions.`);
    } else {
      entries = [...entries.slice(0, i), e, ...entries.slice(i)];
      note(`${e.item.title} landed at No. ${i + 1}.`);
    }
    flashRow(e.item);
  }
  function flashRow(item) { fresh = keyOf(item); setTimeout(() => (fresh = null), 1500); }
  function move(i, d) {
    const j = i + d;
    if (j < 0 || j >= entries.length) return;
    const copy = [...entries];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    entries = copy;
  }
  function remove(i) { entries = entries.filter((_, k) => k !== i); }

  // ---- drag to reorder ----
  // The grabbed pick follows the pointer; the others glide aside. The list order only changes on drop.
  let listEl = $state(null);
  let dragKey = $state(null);
  let drag = null;
  function startDrag(e, key) {
    e.preventDefault();
    const rows = [...listEl.querySelectorAll('li[data-key]')];
    const from = rows.findIndex((r) => r.dataset.key === key);
    if (from < 0) return;
    const y0 = window.scrollY;
    const rects = rows.map((r) => { const b = r.getBoundingClientRect(); return { top: b.top + y0, h: b.height, mid: b.top + y0 + b.height / 2 }; });
    drag = { rows, from, target: from, rects, startY: e.clientY + y0, lastY: e.clientY, h: rects[from].h, raf: 0 };
    dragKey = key;
    rows[from].style.transition = 'none';
    rows.forEach((r, i) => { if (i !== from) r.style.transition = 'transform 180ms cubic-bezier(.2,.8,.2,1)'; });
    drag.raf = requestAnimationFrame(tick);
  }
  function layout() {
    const d = drag;
    const dy = d.lastY + window.scrollY - d.startY;
    d.rows[d.from].style.transform = `translateY(${dy}px)`;
    const center = d.rects[d.from].mid + dy;
    let target = d.from;
    for (let i = 0; i < d.rows.length; i++) {
      if (i < d.from && center < d.rects[i].mid) { target = i; break; }
    }
    for (let i = d.rows.length - 1; i > d.from; i--) {
      if (center > d.rects[i].mid) { target = i; break; }
    }
    d.target = target;
    d.rows.forEach((r, i) => {
      if (i === d.from) return;
      let shift = 0;
      if (target > d.from && i > d.from && i <= target) shift = -d.h;
      if (target < d.from && i >= target && i < d.from) shift = d.h;
      r.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  }
  function tick() {
    if (!drag) return;
    const edge = 70;
    if (drag.lastY < edge) window.scrollBy(0, -Math.ceil((edge - drag.lastY) / 6));
    else if (drag.lastY > window.innerHeight - edge) window.scrollBy(0, Math.ceil((drag.lastY - (window.innerHeight - edge)) / 6));
    layout();
    drag.raf = requestAnimationFrame(tick);
  }
  function onDrag(e) { if (drag) drag.lastY = e.clientY; }
  function endDrag() {
    if (!drag) return;
    const d = drag;
    drag = null;
    cancelAnimationFrame(d.raf);
    const { from, target, rects, h } = d;
    const slotTop = target > from ? rects[target].top + rects[target].h - h : rects[target].top;
    const el = d.rows[from];
    el.style.transition = 'transform 150ms cubic-bezier(.2,.8,.2,1)';
    el.style.transform = `translateY(${slotTop - rects[from].top}px)`;
    setTimeout(() => {
      d.rows.forEach((r) => { r.style.transition = 'none'; r.style.transform = ''; });
      if (target !== from) {
        const copy = [...entries];
        const [moved] = copy.splice(from, 1);
        copy.splice(target, 0, moved);
        entries = copy;
      }
      dragKey = null;
      requestAnimationFrame(() => d.rows.forEach((r) => (r.style.transition = '')));
    }, 155);
  }
  function keyMove(e, i) {
    if (e.key === 'ArrowUp') { e.preventDefault(); move(i, -1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(i, 1); }
  }

  let payload = $derived(JSON.stringify({ category_id: catId, custom_subtitle: customSub, kind, title, tags, entries }));
  const extraLabel = { restaurant: 'City (optional)', recipe: 'Recipe link (optional)', audiobook: 'Narrator', book: 'Year (optional)', movie: 'Year (optional)', tv: 'Year it started (optional)' };
  const creatorLabel = { restaurant: 'Type of food', recipe: 'Whose recipe, or where it is from', audiobook: 'Author', book: 'Author', movie: 'Director', tv: 'Network or service' };
  const DONE_WORD = { restaurant: 'place', recipe: 'recipe' };
</script>

<svelte:window onpointermove={onDrag} onpointerup={endDrag} onpointercancel={endDrag} />

<div class="editor">
  <div class="main">
    <section class="field">
      <span class="label" id="lbl-cat">What are you ranking?</span>
      <p class="hint">Pick a main top ten so your list lines up with everyone else's, or write your own.</p>
      <div class="catpick" role="group" aria-labelledby="lbl-cat">
        {#each categories as c}
          <button type="button" aria-pressed={catId === c.id} onclick={() => { if (entries.length && c.kind !== kind && c.kind !== 'mixed') return note(`Clear your ranking before switching to ${KIND_PLURAL[c.kind]}.`); catId = c.id; if (c.kind === 'mixed') searchKind = searchKind || 'restaurant'; }}>{c.name}</button>
        {/each}
        <button type="button" aria-pressed={!catId} onclick={() => (catId = null)}>Something else</button>
      </div>
      {#if !catId}
        <div class="row" style="margin-top:12px">
          <label for="custom-sub" class="muted">Top 10</label>
          <input id="custom-sub" class="text" style="max-width:280px" placeholder="Movie Twists" bind:value={customSub} maxlength="60" />
          <label for="custom-kind" class="sr">Kind</label>
          <select id="custom-kind" class="text" style="width:auto" bind:value={customKind} disabled={entries.length > 0}>
            {#each Object.entries(KIND) as [k, label]}<option value={k}>{label}{k === 'mixed' ? ' (places and recipes)' : ''}</option>{/each}
          </select>
        </div>
      {/if}
    </section>

    <section class="field">
      <label class="label" for="clever">Give it a clever title</label>
      <input id="clever" class="clever slab" bind:value={title} maxlength="80" autocomplete="off" placeholder={kind === 'audiobook' ? 'Ears On, World Off' : kind === 'movie' ? "Movies I'd Defend in Court" : kind === 'tv' ? 'Couch Canon' : kind === 'restaurant' || kind === 'mixed' ? 'Worth the Drive' : kind === 'recipe' ? 'Weeknight Wins' : 'Books That Wrecked My Sleep'} />
      <div class="cap" style="font-size:12.5px;color:var(--ink-2);margin-top:6px">{subtitle}</div>
    </section>

    <section class="field">
      <span class="label">Tags</span>
      <p class="hint">Three is plenty. Tags are how your list gets matched with similar ones.</p>
      <div class="slots">
        {#each tags as t}<span class="slot on">{t}<button type="button" aria-label="Remove tag {t}" onclick={() => (tags = tags.filter((x) => x !== t))}>×</button></span>{/each}
        {#if tags.length < maxTags}
          <span class="slot">
            <input aria-label="Add a tag" placeholder="add a tag" bind:value={tagInput} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagMatches[0]?.tag ?? tagInput); } }} />
            {#if tagMatches.length}
              <div class="ac">{#each tagMatches as o}<button type="button" onmousedown={(e) => { e.preventDefault(); addTag(o.tag); }}><span>{o.tag}</span><span class="faint">{o.note}</span></button>{/each}</div>
            {/if}
          </span>
        {/if}
        {#if !moreTags}<button type="button" class="btn sm ghost" onclick={() => (moreTags = true)}>+ 2 more</button>{/if}
      </div>
      <div class="sugg">
        {#if suggestions.length}
          <span class="small muted">Suggested from your picks:</span>
          {#each suggestions as [t, n]}<button type="button" class="tag sug" onclick={() => addTag(t)}><b>{t}</b> · {n} of {entries.length}</button>{/each}
        {:else}<span class="small faint">Add a few picks and tag suggestions show up here.</span>{/if}
      </div>
    </section>

    <section class="field">
      <label class="label" for="q">Add {kind === 'mixed' ? 'places and recipes' : KIND_PLURAL[kind]}</label>
      <p class="hint">The first one goes straight in. After that, each new pick faces off against your list.</p>
      {#if kind === 'mixed'}
        <div class="catpick" role="group" aria-label="What are you adding?" style="margin-bottom:10px">
          {#each ['restaurant', 'recipe', 'book', 'movie', 'tv'] as k}<button type="button" aria-pressed={activeKind === k} onclick={() => { searchKind = k; results = []; }}>{KIND[k]}</button>{/each}
        </div>
      {/if}
      <input id="q" class="text" bind:value={query} oninput={onQuery} autocomplete="off"
        placeholder={activeKind === 'restaurant' ? 'Search places already on the site' : activeKind === 'recipe' ? 'Search recipes already on the site' : `Search ${KIND_PLURAL[activeKind]} by title or ${activeKind === 'movie' || activeKind === 'tv' ? 'name' : 'author'}`} />
      {#if searching}<p class="small faint">Searching…</p>{/if}
      {#if searchNote}<p class="small muted">{searchNote}</p>{/if}
      {#if results.length}
        <div class="results">
          {#each results as r}
            <button type="button" class="res" onclick={() => addItem(r)}>
              <Cover title={r.title} kind={r.kind} image={r.image_url} w={34} />
              <span><b>{r.title}</b><br /><span class="small muted">{[r.creator, r.year, r.narrator ? `read by ${r.narrator}` : null].filter(Boolean).join(' · ')}</span></span>
            </button>
          {/each}
        </div>
      {/if}
      <button type="button" class="btn sm ghost" style="margin-top:8px;padding-left:0" onclick={() => (showManual = !showManual)}>
        {showManual ? 'Hide' : (activeKind === 'restaurant' || activeKind === 'recipe') ? `Add a new ${DONE_WORD[activeKind]}` : "Can't find it? Add it by hand"}
      </button>
      {#if showManual || ((activeKind === 'restaurant' || activeKind === 'recipe') && !entries.length && !query)}
        <div class="manual">
          <label>Name<input class="text" bind:value={manual.title} placeholder={activeKind === 'restaurant' ? 'Sweet Spot Bakery' : activeKind === 'recipe' ? 'Brown butter pound cake' : ''} /></label>
          <label>{creatorLabel[activeKind]}<input class="text" bind:value={manual.creator} /></label>
          <label>{extraLabel[activeKind]}<input class="text" bind:value={manual.extra} /></label>
          {#if activeKind === 'restaurant'}<label>What to order<input class="text" bind:value={manual.dish} placeholder="the banana pudding" /></label>{/if}
          <button type="button" class="btn sm dark" onclick={addManual}>Add it</button>
        </div>
      {/if}
    </section>

    <section class="field">
      <div class="between"><span class="label" style="margin:0">Your ranking</span><span class="small muted">{top.length} of 10</span></div>
      {#if entries.length}
        <p class="small muted" style="margin:0 0 8px">Drag the handle to reorder. On a keyboard, focus the handle and use the up and down arrows.</p>
        <ol class="ranks" class:isdragging={dragKey} bind:this={listEl}>
          {#each entries as e, i (keyOf(e.item))}
            <li data-key={keyOf(e.item)} class:fresh={fresh === keyOf(e.item)} class:bench={i >= 10} class:benchstart={i === 10} class:dragging={dragKey === keyOf(e.item)}>
              <button type="button" class="handle" aria-label="Drag to move {e.item.title}, now number {i + 1}"
                onpointerdown={(ev) => startDrag(ev, keyOf(e.item))}
                onkeydown={(ev) => keyMove(ev, i)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
              </button>
              <span class="slab num">{i < 10 ? i + 1 : '·'}</span>
              <Cover title={e.item.title} kind={e.item.kind} image={e.item.image_url} w={40} />
              <div class="info">
                <div class="serif it">{e.item.title}</div>
                <div class="small muted">{[e.item.creator, e.item.narrator ? `read by ${e.item.narrator}` : null].filter(Boolean).join(' · ')}</div>
                {#if e.item.kind === 'restaurant'}<input class="mini" aria-label="What to order at {e.item.title}" placeholder="What to order" bind:value={e.dish} maxlength="60" />{/if}
                {#if i < 10}<input class="mini why" aria-label="Why {e.item.title} is here" placeholder="One line on why it's here (optional)" bind:value={e.why} maxlength="140" />{/if}
              </div>
              <button type="button" class="icon" aria-label="Remove {e.item.title}" onclick={() => remove(i)}>×</button>
            </li>
          {/each}
        </ol>
      {:else}
        <div class="empty">Search above to add your first pick.</div>
      {/if}
    </section>

    <form method="POST" action="?/save" use:enhance={() => { saving = true; return async ({ update }) => { await update({ reset: false }); saving = false; }; }}>
      <input type="hidden" name="payload" value={payload} />
      {#if form?.message}<p class="err" role="alert">{form.message}</p>{/if}
      <div class="row">
        <button class="btn dark" disabled={saving}>{saving ? 'Saving…' : 'Save list'}</button>
        <a class="btn ghost" href={initial?.id ? `/list/${initial.id}` : '/'}>Cancel</a>
      </div>
    </form>
  </div>

  <aside class="side">
    <div class="panel">
      <h3 class="serif">How the ranking works</h3>
      <p class="small">Your first pick goes straight in. Each new one faces off against the middle of your list and narrows down from there, so even a full list takes about four matchups. On a full list, a new pick has to beat your No. 10 first to get in. Drag the handle to fix anything later.</p>
    </div>
  </aside>
</div>

{#if facing}
  <Faceoff top={top} item={facing.item} listTitle={title || 'your list'} onplace={place} oncancel={() => (facing = null)} />
{/if}
{#if msg}<div class="toast" role="status">{msg}</div>{/if}

<style>
  .editor { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 40px; align-items: start; margin-top: 30px; }
  .field { margin-bottom: 30px; }
  .label { display: block; font-weight: 700; margin-bottom: 8px; }
  .hint { font-size: 13.5px; color: var(--ink-2); margin: -4px 0 10px; }
  .catpick { display: flex; flex-wrap: wrap; gap: 8px; }
  .catpick button { min-height: 40px; border: 1.5px solid #CFCDC4; background: #fff; border-radius: 8px; padding: 0 12px; font: 600 14.5px var(--body); cursor: pointer; }
  .catpick button[aria-pressed='true'] { background: var(--slate); color: var(--chalk); border-color: var(--slate); }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .between { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .text { width: 100%; min-height: 44px; border: 1.5px solid #CFCDC4; border-radius: 8px; padding: 0 12px; font: 16px var(--body); background: #fff; }
  .clever { width: 100%; border: 0; border-bottom: 2px solid #CFCDC4; font-size: clamp(28px, 4.4vw, 44px); padding: 4px 0; background: transparent; }
  .clever:focus { outline: none; border-bottom-color: var(--slate); }
  .clever::placeholder { color: #B9B7AF; }
  .slots { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .slot { position: relative; display: inline-flex; align-items: center; gap: 4px; min-height: 38px; border: 1.5px dashed #CFCDC4; border-radius: 20px; padding: 0 6px 0 12px; }
  .slot.on { border-style: solid; background: var(--slate); color: var(--chalk); border-color: var(--slate); }
  .slot.on button { background: transparent; border: 0; color: inherit; font-size: 18px; cursor: pointer; padding: 0 6px; }
  .slot input { border: 0; background: transparent; width: 120px; font: 15px var(--body); }
  .slot input:focus { outline: none; }
  .ac { position: absolute; top: 42px; left: 0; z-index: 30; background: #fff; border: 1px solid #D9D5C7; border-radius: 8px; min-width: 240px; padding: 4px; box-shadow: 0 10px 30px rgba(0,0,0,.12); }
  .ac button { display: flex; justify-content: space-between; gap: 12px; width: 100%; border: 0; background: transparent; padding: 8px 10px; border-radius: 6px; cursor: pointer; font: 14px var(--body); text-align: left; }
  .ac button:hover { background: #F4F3EE; }
  .sugg { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; align-items: center; }
  .sug { background: #fff; cursor: pointer; min-height: 32px; }
  .ghost { border-color: transparent; background: transparent; color: var(--green); }
  .results { margin-top: 8px; display: flex; flex-direction: column; gap: 2px; max-height: 380px; overflow: auto; border: 1px solid var(--line); border-radius: 8px; padding: 4px; }
  .res { display: flex; gap: 12px; align-items: center; border: 0; background: transparent; padding: 8px; border-radius: 6px; text-align: left; cursor: pointer; font: 15px var(--body); }
  .res:hover { background: #F4F3EE; }
  .manual { display: grid; gap: 10px; max-width: 460px; margin-top: 8px; padding: 14px; border: 1px solid var(--line); border-radius: 8px; }
  .manual label { display: grid; gap: 4px; font-weight: 600; font-size: 14px; }
  .ranks { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--ink); }
  .ranks li { display: flex; gap: 14px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); transition: background 1s; }
  .ranks li.fresh { background: #FBF3CF; }
  .ranks li.bench { opacity: .8; }
  .benchstart { margin-top: 46px; border-top: 1px solid var(--ink); position: relative; }
  .benchstart::before { content: 'Honorable mentions'; position: absolute; top: -36px; left: 0; font: italic 22px var(--serif); color: var(--green); }
  .isdragging { user-select: none; -webkit-user-select: none; }
  .dragging { background: #FBFAF6; box-shadow: 0 12px 30px rgba(0,0,0,.18); position: relative; z-index: 5; border-radius: 6px; }
  .ranks li { will-change: transform; background: #fff; }
  .handle { width: 40px; height: 44px; border: 0; background: transparent; color: var(--ink-3); cursor: grab; touch-action: none; border-radius: 6px; flex: none; display: flex; align-items: center; justify-content: center; }
  .handle:hover { color: var(--ink); background: #F4F3EE; }
  .dragging .handle { cursor: grabbing; color: var(--ink); }
  .num { width: 40px; text-align: center; font-size: 28px; flex: none; }
  .info { flex: 1; min-width: 0; }
  .it { font-weight: 700; font-size: 17px; }
  .mini { width: 100%; max-width: 480px; margin-top: 6px; min-height: 36px; border: 1px solid #DDDBD3; border-radius: 6px; padding: 0 10px; font: 14px var(--body); }
  .why { font-family: var(--serif); font-style: italic; }
  .acts { display: flex; gap: 4px; }
  .icon { width: 40px; height: 40px; border: 1.5px solid #CFCDC4; border-radius: 6px; background: #fff; cursor: pointer; font-size: 17px; }
  .icon:disabled { opacity: .35; cursor: not-allowed; }
  .empty { border: 1.5px dashed #CFCDC4; border-radius: 8px; padding: 22px; text-align: center; color: var(--ink-2); }
  .err { color: #B42318; font-weight: 600; }
  .panel { background: #FFFDF6; border: 1px solid #D9D5C7; padding: 16px; position: sticky; top: 20px; }
  .panel h3 { margin: 0 0 8px; font-size: 18px; }
  .toast { position: fixed; left: 50%; bottom: 90px; transform: translateX(-50%); background: var(--slate); color: var(--chalk); padding: 10px 18px; border-radius: 10px; font-weight: 600; z-index: 70; max-width: 90vw; text-align: center; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @media (max-width: 900px) { .editor { grid-template-columns: 1fr; } .side { display: none; } }
  @media (max-width: 640px) { .icon { width: 36px; height: 36px; } .num { width: 28px; font-size: 22px; } }
</style>
