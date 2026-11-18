<script>
  import { goto } from '$app/navigation';
  import RecCard from '$lib/components/RecCard.svelte';
  import { page } from '$app/state';
  let added = $derived(page.url.searchParams.get('added'));
  let addedCard = $derived(added ? data.cards.find((c) => c.item.id === added) : null);
  let { data } = $props();
  const KINDS = [['', 'Everything'], ['book', 'Books'], ['tv', 'TV'], ['movie', 'Movies'], ['podcast', 'Podcasts'], ['restaurant', 'Food'], ['recipe', 'Recipes'], ['place', 'Places']];
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

{#if addedCard}<p class="toast" role="status">{page.url.searchParams.get('dup') ? 'Already on the board from them. ' : 'On the board: '}<b>{addedCard.item.title}</b></p>{/if}

<div class="filters" role="group" aria-label="Show">
  {#each KINDS as [k, label]}
    <button class="chip" aria-pressed={(data.opts.kind ?? '') === k} onclick={() => set('kind', k)}>{label}</button>
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
</div>

{#if data.cards.length}
  <div class="list">
    {#each data.cards as card (card.item.id)}<RecCard {card} />{/each}
  </div>
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
  .chip[aria-pressed='true'] { background: var(--ink); border-color: var(--ink); color: #fff; }
  .filters2 { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0 14px; }
  .filters2 label { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--ink-2); font-weight: 600; }
  .filters2 select { min-height: 36px; border: 1.5px solid #D6D4CC; border-radius: 8px; padding: 0 8px; font: 14px var(--body); background: #fff; max-width: 190px; }
  .list { display: grid; gap: 10px; }
  .toast { background: #E4F0EA; color: #1F4D3A; padding: 10px 14px; border-radius: 10px; margin: 0 0 12px; }
  .empty { padding: 30px 0; color: var(--ink-2); }
</style>
