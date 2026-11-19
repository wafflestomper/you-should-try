<script>
  import ShowMe from '$lib/components/ShowMe.svelte';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import RecCard from '$lib/components/RecCard.svelte';
  import { toast } from '$lib/toast.svelte.js';
  import { KIND_INFO } from '$lib/kinds.js';
  import { seen, pinFresh, markSeen } from '$lib/seen.svelte.js';
  let { data, form } = $props();

  // New cards stay at the top for this visit (so nothing jumps), then settle into place next time
  const pinned = $derived(pinFresh(data.cards));
  const cards = $derived.by(() => {
    if (!pinned.length) return data.cards;
    const at = new Map(pinned.map((id, i) => [id, i]));
    const top = data.cards.filter((c) => at.has(c.item.id)).sort((a, b) => at.get(a.item.id) - at.get(b.item.id));
    return [...top, ...data.cards.filter((c) => !at.has(c.item.id))].map((c) => (at.has(c.item.id) ? { ...c, fresh: true } : c));
  });
  const freshCount = $derived(cards.filter((c) => c.fresh).length);
  const unseen = $derived(cards.filter((c) => c.fresh && !seen.local.has(c.item.id)).length);
  let listEl = $state();
  // Once a new card has been mostly on screen for a moment, it counts as seen and its badge fades
  $effect(() => {
    if (!listEl || !unseen) return;
    const timers = new Map();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = e.target.dataset.id;
        if (e.isIntersecting) { if (!timers.has(id)) timers.set(id, setTimeout(() => { markSeen(id); io.unobserve(e.target); }, 1500)); }
        else { clearTimeout(timers.get(id)); timers.delete(id); }
      }
    }, { threshold: 0.6 });
    const freshIds = new Set(cards.filter((c) => c.fresh && !seen.local.has(c.item.id)).map((c) => c.item.id));
    for (const el of listEl.querySelectorAll('.rcw[data-id]')) if (freshIds.has(el.dataset.id)) io.observe(el);
    return () => { io.disconnect(); for (const t of timers.values()) clearTimeout(t); };
  });

  let addedCard = $derived(data.addedTitle ? { item: { title: data.addedTitle } } : null);
  let view = $state('cards');
  onMount(() => { try { const v = localStorage.getItem('yst_view'); if (v === 'stack' || v === 'list') view = 'stack'; } catch {} });
  function setView(v) { view = v; try { localStorage.setItem('yst_view', v); } catch {} }

  const KINDS = [['', 'All', null], ...KIND_INFO.filter((k) => k.key !== 'other').map((k) => [k.key, k.plural, k.color])];
  function set(key, val) {
    const u = new URL(location.href);
    if (val) u.searchParams.set(key, val); else u.searchParams.delete(key);
    goto(u.pathname + u.search, { keepFocus: true, noScroll: true });
  }
  let personName = $derived(data.people.find((p) => p.key === data.opts.person)?.name);

  // Saved filters: the board reopens on the last one you picked
  function useFilter(id, groups = []) {
    try { localStorage.setItem('yst_filter', groups.length ? 'grp:' + JSON.stringify(groups) : id || ''); } catch {}
    const u = new URL(location.href);
    for (const k of ['f', 'g', 'kind', 'person']) u.searchParams.delete(k);
    if (id) u.searchParams.set('f', id);
    for (const g of groups) u.searchParams.append('g', g);
    editing = null;
    goto(u.pathname + u.search, { keepFocus: true, noScroll: true, replaceState: groups.length > 0 });
  }
  onMount(() => {
    if (location.search) return;
    let id = ''; try { id = localStorage.getItem('yst_filter') || ''; } catch {}
    if (id.startsWith('grp:')) {
      let gs = []; try { gs = JSON.parse(id.slice(4)).filter((g) => data.groups.some((x) => x.name === g)); } catch {}
      if (gs.length) useFilter('', gs);
    } else if (id && data.filters.some((f) => f.id === id)) goto(`/?f=${encodeURIComponent(id)}`, { replaceState: true, keepFocus: true, noScroll: true });
  });
  // Groups: one button opens the list; pick any number, and the board updates as you go
  let groupsOpen = $state(false);
  let picked = $state([]);
  $effect.pre(() => { picked = data.active?.group ? [...data.active.names] : []; });
  let gTimer;
  function toggleGroup(name) {
    picked = picked.includes(name) ? picked.filter((g) => g !== name) : [...picked, name];
    clearTimeout(gTimer);
    gTimer = setTimeout(() => useFilter('', picked), 350);
  }
  const andList = (xs) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
  // The filter editor: null (closed), 'new', or a saved filter
  let editing = $state(null);
  let fName = $state(''), fPeople = $state([]), fKinds = $state([]), fVia = $state(false);
  function openEditor(f) {
    editing = f ?? 'new';
    fName = f?.name ?? ''; fPeople = [...(f?.people ?? [])]; fKinds = [...(f?.kinds ?? [])]; fVia = f ? f.via : false;
  }
  // A real name for the example under the checkbox: someone checked in this filter who has added picks for others
  let viaExample = $derived((() => {
    const p = data.people.filter((x) => fPeople.includes(x.key) && x.key.startsWith('u:')).sort((a, b) => b.v - a.v)[0];
    return p ? p.name.split(' ')[0] : 'Amy';
  })());
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  // First name, or the full name when two people share a first name
  const nameOf = (key) => {
    const full = data.people.find((p) => p.key === key)?.name ?? 'Someone', first = full.split(' ')[0];
    return data.people.filter((p) => p.name.split(' ')[0] === first).length > 1 ? full : first;
  };
  let activeKinds = $derived(data.active?.kinds?.length ? new Set(data.active.kinds) : null);
  let shownKinds = $derived(activeKinds ? KINDS.filter(([k]) => !k || activeKinds.has(k)) : KINDS);
  let summary = $derived(data.active ? [
    data.active.people.length ? data.active.people.map(nameOf).join(', ') : 'Everyone',
    data.active.kinds.length ? data.active.kinds.map((k) => KIND_INFO.find((x) => x.key === k)?.plural ?? k).join(', ') : 'all types'
  ].join(' · ') : '');
  let sumVia = $derived(data.active?.via && data.active.people.length ? ', plus picks they added for others' : '');
  let more = $state(false);
  import { install, detect } from '$lib/install.svelte.js';
  let homeTip = $state(false);
  onMount(() => {
    const i = detect();
    let seen = false; try { seen = !!localStorage.getItem('yst_home_tip'); } catch {}
    homeTip = !seen && !i.standalone && i.platform !== 'desktop';
  });
  function dismissTip() { homeTip = false; try { localStorage.setItem('yst_home_tip', '1'); } catch {} }
  async function oneTap() {
    if (!install.prompt) return;
    install.prompt.prompt(); await install.prompt.userChoice.catch(() => {}); install.prompt = null; install.ready = false; dismissTip();
  }
</script>

<svelte:head><title>You Should Try…</title></svelte:head>

{#if addedCard}
  {@const how = page.url.searchParams.get('how')}
  <p class="toast" role="status">
    {#if how === 'mine'}<b>{addedCard.item.title}</b> is on your list. Only you can see it.{:else if how === 'dup'}<b>{addedCard.item.title}</b> was already on the board from them.{:else if how === 'joined'}Added to <b>{addedCard.item.title}</b>. It's one card now with everyone who recommended it.{:else}On the board: <b>{addedCard.item.title}</b>{/if}
  </p>
{/if}

{#if homeTip}
  <aside class="hometip" aria-label="Tip">
    <div><b>Put this on your home screen</b><br /><span>It opens like an app, so it's one tap when someone says "you should try…"</span></div>
    <div class="ht-acts">
      {#if install.ready}<button class="btn dark sm" onclick={oneTap}>Add it</button>{:else}<a class="btn dark sm" href="/install" onclick={dismissTip}>Show me how</a>{/if}
      <button class="ht-x" onclick={dismissTip}>Not now</button>
    </div>
  </aside>
{/if}

{#if data.invitee}
  {@const f = data.invitee.name.split(' ')[0]}
  <p class="toast invitee" role="status">
    <span>{f} isn't on here yet.{data.invitee.invited ? ' You already sent an invite.' : ''}</span>
    <a class="btn dark sm" href="/people?guest={data.invitee.id}#invite">{data.invitee.invited ? 'Invite again' : `Invite ${f}`}</a>
  </p>
{/if}
{#if toast.text}
  {#key toast.id}
    <div class="toast invitee quick" role="status"><span>{toast.text}</span>
      {#if toast.undo}<button class="btn sm" onclick={() => { const u = toast.undo; toast.undo = null; u(); }}>Undo</button>{/if}</div>
  {/key}
{/if}
{#if page.url.searchParams.get('removed')}<p class="toast" role="status">Removed from the board.</p>{/if}

<div class="saved" role="group" aria-label="Saved filters">
  <button class="sf" aria-pressed={!data.active} onclick={() => useFilter('')}>Everyone</button>
  {#if data.groups.length}
    <button class="sf grp" aria-pressed={picked.length > 0} aria-expanded={groupsOpen} aria-controls="grp-list" onclick={() => (groupsOpen = !groupsOpen)}>
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2" fill="currentColor"/><circle cx="16.5" cy="9" r="2.6" fill="currentColor" opacity=".6"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M14.5 14c3 0 6.5 1.6 6.5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Groups{picked.length ? ` (${picked.length})` : ''}
      <svg class="chev" class:up={groupsOpen} width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>
    </button>
  {/if}
  {#each data.filters as f (f.id)}<button class="sf" aria-pressed={data.active?.id === f.id} onclick={() => useFilter(f.id)}>{f.name}</button>{/each}
  <button class="sf add" onclick={() => openEditor(null)} aria-label="Make a filter">+ Filter</button>
</div>
{#if groupsOpen}
  <div class="glist" id="grp-list" role="group" aria-label="Groups">
    {#each data.groups as g (g.name)}
      <button class="gopt" aria-pressed={picked.includes(g.name)} onclick={() => toggleGroup(g.name)}>
        <span class="box" aria-hidden="true">{#if picked.includes(g.name)}<svg width="14" height="14" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>{/if}</span>
        <span class="gn">{g.name}</span><span class="gs">{g.size}</span>
      </button>
    {/each}
    <div class="gfoot">
      {#if picked.length}<button class="lnk" onclick={() => { picked = []; clearTimeout(gTimer); useFilter(''); }}>Clear</button>{:else}<span></span>{/if}
      <button class="btn sm" onclick={() => (groupsOpen = false)}>Done</button>
    </div>
  </div>
{/if}
{#if data.active?.group}
  <p class="fsum">Everyone in {andList(data.active.names)}: {data.active.size} {data.active.size === 1 ? 'person' : 'people'}{data.active.counted ? ', counting you' : ''}</p>
{:else if data.active && !editing}
  <form class="fsum" method="POST" action="?/deleteFilter" use:enhance={({ cancel }) => { if (!confirm(`Delete the "${data.active.name}" filter?`)) return cancel(); return async ({ update }) => { await update({ reset: false, invalidateAll: true }); useFilter(''); }; }}>
    {summary}{sumVia} · <button type="button" class="lnk" onclick={() => openEditor(data.active)}>Edit</button> · <input type="hidden" name="id" value={data.active.id} /><button class="lnk">Delete</button>
  </form>
{/if}
{#if editing}
  <form class="fed" method="POST" action="?/saveFilter" use:enhance={() => async ({ result, update }) => {
      if (result.type === 'success' && result.data?.savedFilter) { await update({ reset: false, invalidateAll: true }); useFilter(result.data.savedFilter); }
      else if (result.type === 'success' && result.data?.deletedFilter) { await update({ reset: false, invalidateAll: true }); useFilter(''); }
      else await update({ reset: false }); }}>
    {#if editing !== 'new'}<input type="hidden" name="id" value={editing.id} />{/if}
    <ShowMe topic="filter" />
    <label class="fl" for="f-name">Name</label>
    <input id="f-name" name="name" bind:value={fName} maxlength="40" placeholder="Three Amigos" autocomplete="off" />
    <span class="fl">People</span>
    <div class="pp">
      {#each data.people.filter((x) => x.n || fVia || fPeople.includes(x.key)) as p (p.key)}
        <label class="pc" class:on={fPeople.includes(p.key)}><input type="checkbox" name="people" value={p.key} checked={fPeople.includes(p.key)} onchange={() => (fPeople = toggle(fPeople, p.key))} />
          <span>{p.name}</span><span class="pn">{[p.n ? `${p.n} ${p.n === 1 ? 'pick' : 'picks'}` : '', fVia && p.v ? `added ${p.v} for others` : ''].filter(Boolean).join(' · ')}</span></label>
      {/each}
    </div>
    <label class="via"><input type="checkbox" bind:checked={fVia} /><span>Also show picks they added for other people<span class="muted vsub">Like "Warren · via {viaExample}": Warren recommended it, {viaExample} added it.</span></span></label>
    <input type="hidden" name="via" value={fVia ? '1' : '0'} />
    <span class="fl">Types <span class="muted">(none picked means all)</span></span>
    <div class="kk">
      {#each KIND_INFO.filter((k) => k.key !== 'other') as k (k.key)}
        <label class="chip" style="--c:{k.color}" class:on={fKinds.includes(k.key)}><input type="checkbox" name="kinds" value={k.key} checked={fKinds.includes(k.key)} onchange={() => (fKinds = toggle(fKinds, k.key))} /><span class="dot"></span>{k.plural}</label>
      {/each}
    </div>
    {#if form?.filterError}<p class="err" role="alert">{form.filterError}</p>{/if}
    <div class="fbtns">
      <button class="btn dark">{editing === 'new' ? 'Save filter' : 'Save changes'}</button>
      <button type="button" class="btn" onclick={() => (editing = null)}>Cancel</button>
      {#if editing !== 'new'}<button type="submit" class="btn del" formaction="?/deleteFilter" onclick={() => { try { localStorage.setItem('yst_filter', ''); } catch {} }}>Delete</button>{/if}
    </div>
  </form>
{/if}

<div class="filters" role="group" aria-label="Show">
  {#each shownKinds as [k, label, color]}
    <button class="chip" style={color ? `--c:${color}` : ''} aria-pressed={(data.opts.kind ?? '') === k} onclick={() => set('kind', k)}>{#if color}<span class="dot"></span>{/if}{label}</button>
  {/each}
</div>

<div class="bar">
  <button class="morebtn" aria-expanded={more} onclick={() => (more = !more)}>
    {personName ? `From ${personName.split(' ')[0]}` : 'Anyone'} · {data.opts.days ? `past ${data.opts.days === 7 ? 'week' : data.opts.days === 30 ? 'month' : '3 months'}` : 'any time'} · {data.opts.sort === 'new' ? 'newest' : data.opts.sort === 'loved' ? 'most loved' : 'best for you'}
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
  </button>
  <div class="vs" role="group" aria-label="Layout">
    <button aria-pressed={view === 'cards'} onclick={() => setView('cards')}>Cards</button>
    <button aria-pressed={view === 'stack'} onclick={() => setView('stack')}>Stack</button>
  </div>
</div>
{#if more}
  <div class="filters2">
    <label>From
      <select value={data.opts.person ?? ''} onchange={(e) => set('person', e.currentTarget.value)}>
        <option value="">Anyone</option>
        {#each data.people as p (p.key)}<option value={p.key}>{p.name} ({p.n})</option>{/each}
      </select>
    </label>
    <label>When
      <select value={String(data.opts.days ?? '')} onchange={(e) => set('days', e.currentTarget.value)}>
        <option value="">Any time</option><option value="7">Past week</option><option value="30">Past month</option><option value="90">Past 3 months</option>
      </select>
    </label>
    <label>Sort
      <select value={data.opts.sort} onchange={(e) => set('sort', e.currentTarget.value === 'best' ? '' : e.currentTarget.value)}>
        <option value="best">Best for you</option><option value="new">Newest</option><option value="loved">Most loved</option>
      </select>
    </label>
  </div>
{/if}

{#if freshCount}<p class="newline" class:done={!unseen}>{freshCount} new since you last looked</p>{/if}
{#if data.cards.length}
  <div class="list" class:stack={view === 'stack'} bind:this={listEl}>
    {#each cards as card (card.item.id)}<RecCard {card} stacked={view === 'stack'} swipe fresh={card.fresh && !seen.local.has(card.item.id)} />{/each}
  </div>
  <div class="boardhelp"><ShowMe topic="board" label="Show me how the board works" /></div>
{:else}
  <p class="empty">{personName ? `Nothing from ${personName} here yet.` : 'Nothing here yet.'} Heard something good? <a href="/add">Add it</a>.</p>
{/if}

<style>
  .hometip { display: grid; gap: 10px; background: var(--surface); border-radius: 16px; padding: 14px; margin: 4px 0 12px; }
  .hometip span { color: var(--ink-2); font-size: 14px; }
  .ht-acts { display: flex; gap: 10px; align-items: center; }
  .ht-x { background: none; border: 0; font: 700 14px Manrope, sans-serif; color: var(--ink-2); cursor: pointer; min-height: 40px; }
  .quick { position: sticky; top: 72px; z-index: 20; box-shadow: 0 6px 20px rgba(0,0,0,.12);
    animation: flash 1.1s ease-out both, leave .35s ease-in 4.65s both; }
  /* Starts red to catch the eye, settles to the normal look, then slips away at 5 seconds */
  @keyframes flash { 0%, 25% { background: #D92D20; color: #fff; } 100% { background: var(--surface); color: var(--ink); } }
  @keyframes leave { to { opacity: 0; transform: translateY(-6px); } }
  @media (prefers-reduced-motion: reduce) { .quick { animation: none; } }
  .invitee { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .invitee .btn { text-decoration: none; min-height: 38px; display: inline-flex; align-items: center; padding: 0 14px; }
  .toast { background: var(--surface); padding: 10px 14px; border-radius: 12px; margin: 4px 0 10px; font-weight: 600; }
  .saved { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 2px -14px 6px; padding: 2px 14px; }
  .sf { flex: none; min-height: 34px; padding: 0 14px; border-radius: 10px; border: 1.5px solid var(--line); background: none; color: var(--ink-2); font: 800 13.5px Manrope, sans-serif; cursor: pointer; }
  .sf[aria-pressed='true'] { border-color: var(--ink); color: var(--ink); background: var(--surface); }
  .sf.add { border-style: dashed; }
  .sf.grp { display: inline-flex; align-items: center; gap: 6px; }
  .chev { transition: transform .2s; }
  .chev.up { transform: rotate(180deg); }
  .glist { display: grid; gap: 4px; background: var(--surface); border-radius: 16px; padding: 8px; margin: 0 0 10px; max-height: 50vh; overflow-y: auto; }
  .gopt { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; min-height: 46px; padding: 0 10px; border: 0; border-radius: 10px; background: none; color: var(--ink); font: 700 15px Manrope, sans-serif; text-align: left; cursor: pointer; }
  .gopt:hover { background: var(--surface-2); }
  .gopt .box { width: 22px; height: 22px; border-radius: 6px; border: 2px solid var(--line); display: grid; place-items: center; }
  .gopt[aria-pressed='true'] .box { background: var(--ink); border-color: var(--ink); color: var(--bg, #fff); }
  .gs { color: var(--ink-2); font-size: 13px; font-weight: 700; }
  .gfoot { display: flex; justify-content: space-between; align-items: center; padding: 6px 4px 2px; }
  .fsum { margin: 0 0 6px; font-size: 13.5px; color: var(--ink-2); }
  .lnk { background: none; border: 0; padding: 0; font: 700 13.5px Manrope, sans-serif; color: var(--ink); text-decoration: underline; cursor: pointer; }
  .fed { display: grid; gap: 8px; background: var(--surface); border-radius: 16px; padding: 14px; margin: 4px 0 10px; }
  .fl { font-weight: 800; font-size: 14px; margin-top: 4px; }
  .fed input[name='name'] { min-height: 46px; border-radius: 12px; border: 1px solid var(--line); padding: 0 12px; font: 16px Manrope, sans-serif; background: var(--surface-2); color: var(--ink); }
  .pp { display: grid; gap: 4px; max-height: 260px; overflow-y: auto; }
  .pc { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; min-height: 42px; padding: 0 10px; border-radius: 10px; background: var(--surface-2); cursor: pointer; }
  .pc.on { outline: 2px solid var(--ink); }
  .pc input, .kk input { width: 18px; height: 18px; accent-color: var(--ink); }
  .pn { font-size: 12.5px; color: var(--ink-3); }
  .via { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; font-weight: 600; }
  .vsub { display: block; font-weight: 500; font-size: 13px; margin-top: 2px; }
  .via input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--ink); }
  .kk { display: flex; gap: 6px; flex-wrap: wrap; }
  .kk .chip { background: var(--surface-2); }
  .kk .chip.on { background: var(--ink); color: var(--bg); }
  .kk input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .fbtns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
  .fbtns .btn { min-height: 44px; padding: 0 16px; }
  .fbtns .del { color: #B42318; margin-left: auto; }
  .err { color: #B42318; font-weight: 700; margin: 0; }
  .filters { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0 2px; scrollbar-width: none; margin: 0 -14px; padding-left: 14px; padding-right: 14px; }
  .filters::-webkit-scrollbar { display: none; }
  .chip { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 14px; border-radius: 18px; border: 0; background: var(--surface); color: var(--ink); font: 700 14px Manrope, sans-serif; cursor: pointer; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
  .chip[aria-pressed='true'] { background: var(--ink); color: var(--bg); }
  .bar { display: flex; align-items: center; gap: 10px; margin: 10px 0 4px; }
  .morebtn { display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; padding: 6px 0; font: 700 13.5px Manrope, sans-serif; color: var(--ink-2); cursor: pointer; min-height: 36px; text-align: left; }
  .vs { margin-left: auto; display: flex; background: var(--surface); border-radius: 12px; padding: 3px; flex: none; }
  .vs button { border: 0; background: none; font: 800 13px Manrope, sans-serif; padding: 0 12px; min-height: 32px; border-radius: 9px; color: var(--ink-2); cursor: pointer; }
  .vs button[aria-pressed='true'] { background: var(--surface-2); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,.12); }
  .filters2 { display: flex; gap: 10px; flex-wrap: wrap; margin: 4px 0 10px; }
  .filters2 label { display: flex; align-items: center; gap: 6px; font-size: 13.5px; color: var(--ink-2); font-weight: 700; }
  .filters2 select { min-height: 36px; border-radius: 10px; padding: 0 8px; font: 14px Manrope, sans-serif; max-width: 190px; border: 1px solid var(--line); }
  .list { display: grid; gap: 14px; padding-top: 6px; }
  .boardhelp { text-align: center; margin-top: 16px; }
  .newline { margin: 4px 0 2px; font: 800 14px Manrope, sans-serif; color: #E11D48; transition: color .8s; }
  .newline.done { color: var(--ink-2); font-weight: 700; }
  .list.stack { gap: 0; padding-top: 10px; }
  .list.stack > :global(.rcw.collapsed + .rcw) { margin-top: -26px; }
  .list.stack > :global(.rcw:not(.collapsed) + .rcw.collapsed) { margin-top: 14px; }
  :global(.look-dark) .list.stack > :global(.rcw.collapsed + .rcw:not(.collapsed)) { margin-top: -12px; }
  :global(.look-light) .list.stack > :global(.rcw.collapsed + .rcw:not(.collapsed)) { margin-top: 44px; }
  .empty { padding: 30px 0; color: var(--ink-2); }
</style>
