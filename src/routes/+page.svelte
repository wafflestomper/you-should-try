<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import RecCard from '$lib/components/RecCard.svelte';
  import { toast } from '$lib/toast.svelte.js';
  import { KIND_INFO } from '$lib/kinds.js';
  let { data, form } = $props();

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

<div class="filters" role="group" aria-label="Show">
  {#each KINDS as [k, label, color]}
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

{#if data.cards.length}
  <div class="list" class:stack={view === 'stack'}>
    {#each data.cards as card (card.item.id)}<RecCard {card} stacked={view === 'stack'} swipe />{/each}
  </div>
{:else}
  <p class="empty">{personName ? `Nothing from ${personName} here yet.` : 'Nothing here yet.'} Heard something good? <a href="/add">Add it</a>.</p>
{/if}

<style>
  .hometip { display: grid; gap: 10px; background: var(--surface); border-radius: 16px; padding: 14px; margin: 4px 0 12px; }
  .hometip span { color: var(--ink-2); font-size: 14px; }
  .ht-acts { display: flex; gap: 10px; align-items: center; }
  .ht-x { background: none; border: 0; font: 700 14px Manrope, sans-serif; color: var(--ink-2); cursor: pointer; min-height: 40px; }
  .quick { position: sticky; top: 72px; z-index: 20; box-shadow: 0 6px 20px rgba(0,0,0,.12); }
  .invitee { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .invitee .btn { text-decoration: none; min-height: 38px; display: inline-flex; align-items: center; padding: 0 14px; }
  .toast { background: var(--surface); padding: 10px 14px; border-radius: 12px; margin: 4px 0 10px; font-weight: 600; }
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
  .list.stack { gap: 0; padding-top: 10px; }
  .list.stack > :global(.rcw.collapsed + .rcw) { margin-top: -26px; }
  .list.stack > :global(.rcw:not(.collapsed) + .rcw.collapsed) { margin-top: 14px; }
  :global(.look-dark) .list.stack > :global(.rcw.collapsed + .rcw:not(.collapsed)) { margin-top: -12px; }
  :global(.look-light) .list.stack > :global(.rcw.collapsed + .rcw:not(.collapsed)) { margin-top: 44px; }
  .empty { padding: 30px 0; color: var(--ink-2); }
</style>
