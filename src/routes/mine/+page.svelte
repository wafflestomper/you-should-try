<script>
  import RecCard from '$lib/components/RecCard.svelte';
  let { data } = $props();
  const TABS = [['done', 'Done'], ['hidden', 'Hidden']];
  const EMPTY = { done: "Nothing finished yet. When you've tried something on the board, mark how it was and it moves here.", hidden: "Nothing hidden. Hiding something takes it off your board only." };
</script>

<svelte:head><title>History · You Should Try…</title></svelte:head>

<h1>History</h1>
<p class="sub">Things you've finished or hidden. They're off your board, and everyone else still sees them.</p>
<div class="tabs" role="tablist">
  {#each TABS as [v, label]}
    <a href="?v={v}" role="tab" aria-selected={data.view === v}>{label}{#if data.counts[v]} <span>{data.counts[v]}</span>{/if}</a>
  {/each}
</div>
{#if data.cards.length}
  <div class="list">{#each data.cards as card (card.item.id)}<RecCard {card} />{/each}</div>
{:else}
  <p class="empty">{EMPTY[data.view]}</p>
{/if}

<style>
  h1 { font-size: 24px; margin: 10px 0; }
  .sub { color: var(--ink-2); margin: 0 0 12px; }
  .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
  .tabs a { padding: 8px 14px; border-radius: 18px; text-decoration: none; color: var(--ink); font-weight: 600; border: 1.5px solid #D6D4CC; background: #fff; }
  .tabs a[aria-selected='true'] { background: var(--ink); color: #fff; border-color: var(--ink); }
  .tabs span { opacity: .7; }
  .list { display: grid; gap: 10px; }
  .empty { color: var(--ink-2); padding: 20px 0; }
</style>
