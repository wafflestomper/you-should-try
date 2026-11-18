<script>
  import { goto } from '$app/navigation';
  import RecCard from '$lib/components/RecCard.svelte';
  import { page } from '$app/state';
  let added = $derived(page.url.searchParams.get('added'));
  let addedCard = $derived(data.addedTitle ? { item: { title: data.addedTitle } } : null);
  let { data } = $props();
  import { KIND_INFO, kindColor } from '$lib/kinds.js';
  import { onMount } from 'svelte';
  let compact = $state(false);
  onMount(() => { try { compact = localStorage.getItem('yst_view') === 'list'; } catch {} });
  function setView(v) { compact = v; try { localStorage.setItem('yst_view', v ? 'list' : 'cards'); } catch {} }
  const first = (n) => n.split(' ')[0];
  function ago(iso) {
    const d = (Date.now() - Date.parse(iso.replace(' ', 'T') + 'Z')) / 864e5;
    return d < 1 ? 'today' : d < 7 ? `${Math.floor(d)}d` : d < 60 ? `${Math.floor(d / 7)}w` : `${Math.floor(d / 30)}mo`;
  }
  const KINDS = [['', 'Everything', '#1E1E1E'], ...KIND_INFO.filter((k) => k.key !== 'other').map((k) => [k.key, k.plural, k.color])];
  function set(key, val) {
    const u = new URL(location.href);
    if (val) u.searchParams.set(key, val); else u.searchParams.delete(key);
    goto(u.pathname + u.search, { keepFocus: true, noScroll: true });
  }
  let personName = $derived(data.people.find((p) => p.key === data.opts.person)?.name);
</script>

<svelte:head><title>You Should Try…</title></svelte:head>

<a href="/add" class="hero">
  <span class="mic" aria-hidden="true">🎙️</span>
  <span><b>You should try…</b><br /><span class="sub2">Heard a good one? Tap and say it.</span></span>
</a>

{#if addedCard}
  {@const how = page.url.searchParams.get('how')}
  <p class="toast" role="status">
    {#if how === 'dup'}<b>{addedCard.item.title}</b> was already on the board from them.{:else if how === 'joined'}Added to <b>{addedCard.item.title}</b>. It's one card now with everyone who recommended it.{:else}On the board: <b>{addedCard.item.title}</b>{/if}
  </p>
{/if}

<div class="filters" role="group" aria-label="Show">
  {#each KINDS as [k, label, color]}
    <button class="chip" style="--c:{color}" aria-pressed={(data.opts.kind ?? '') === k} onclick={() => set('kind', k)}>{#if k}<span class="dot"></span>{/if}{label}</button>
  {/each}
</div>
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
  <div class="viewsw" role="group" aria-label="Layout">
    <button aria-pressed={!compact} onclick={() => setView(false)}>Cards</button>
    <button aria-pressed={compact} onclick={() => setView(true)}>List</button>
  </div>
</div>

{#if data.cards.length}
  {#if compact}
    <ul class="rows">
      {#each data.cards as c (c.item.id)}
        <li style="--kc:{kindColor(c.item.kind)}">
          <a href="/item/{c.item.id}">
            <span class="kdot" aria-hidden="true"></span>
            <span class="t">{#if c.mine?.state === 'starred'}<span class="st" aria-label="Starred">★</span>{/if}{c.item.title}</span>
            <span class="w">{[...new Set(c.recs.map((r) => first(r.by_name)))].slice(0, 2).join(', ')}{c.loved.length ? ` · ❤️${c.loved.length}` : ''}</span>
            <span class="a">{ago(c.newest)}</span>
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="list">
      {#each data.cards as card (card.item.id)}<RecCard {card} />{/each}
    </div>
  {/if}
{:else}
  <p class="empty">{personName ? `Nothing from ${personName} here yet.` : 'Nothing here yet.'} Heard something good? <a href="/add">Add it</a>.</p>
{/if}

<style>
  .hero { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: 16px; background: var(--accent); color: #fff; text-decoration: none; margin: 8px 0 16px; }
  .hero b { font-size: 22px; }
  .sub2 { opacity: .85; font-size: 15px; }
  .mic { width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,.18); display: grid; place-items: center; font-size: 30px; flex: none; }
  .filters { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
  .chip { flex: none; min-height: 36px; padding: 0 14px; border-radius: 18px; border: 1.5px solid #D6D4CC; background: #fff; font: 600 14px var(--body); cursor: pointer; color: var(--ink); }
  .chip { display: inline-flex; align-items: center; gap: 6px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c); }
  .chip[aria-pressed='true'] { background: var(--c); border-color: var(--c); color: #fff; }
  .chip[aria-pressed='true'] .dot { background: #fff; }
  .filters2 { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0 14px; }
  .filters2 label { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--ink-2); font-weight: 600; }
  .filters2 select { min-height: 36px; border: 1.5px solid #D6D4CC; border-radius: 8px; padding: 0 8px; font: 14px var(--body); background: #fff; max-width: 190px; }
  .list { display: grid; gap: 10px; }
  .viewsw { display: inline-flex; border: 1.5px solid #D6D4CC; border-radius: 8px; overflow: hidden; margin-left: auto; }
  .viewsw button { min-height: 34px; padding: 0 12px; border: 0; background: #fff; font: 600 14px var(--body); cursor: pointer; color: var(--ink-2); }
  .viewsw button[aria-pressed='true'] { background: var(--ink); color: #fff; }
  .rows { list-style: none; margin: 0; padding: 0; background: #fff; border: 1px solid #E6E5E0; border-radius: 12px; overflow: hidden; }
  .rows li + li { border-top: 1px solid #EFEEEA; }
  .rows a { display: grid; grid-template-columns: 10px 1fr auto auto; gap: 10px; align-items: center; padding: 11px 12px; text-decoration: none; color: var(--ink); min-height: 24px; }
  .rows a:hover, .rows a:focus-visible { background: #F7F7F4; }
  .kdot { width: 10px; height: 10px; border-radius: 50%; background: var(--kc); }
  .t { font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .st { color: #C99A06; margin-right: 4px; }
  .w { color: var(--ink-2); font-size: 13.5px; white-space: nowrap; max-width: 34vw; overflow: hidden; text-overflow: ellipsis; }
  .a { color: var(--ink-3); font-size: 13px; width: 32px; text-align: right; }
  .toast { background: #E4F0EA; color: #1F4D3A; padding: 10px 14px; border-radius: 10px; margin: 0 0 12px; }
  .empty { padding: 30px 0; color: var(--ink-2); }
</style>
