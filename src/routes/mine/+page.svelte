<script>
  import RecCard from '$lib/components/RecCard.svelte';
  let { data } = $props();
  const TABS = [['picks', 'Your picks'], ['done', 'Done'], ['hidden', 'Not for me']];
  const EMPTY = { picks: "Nothing you've recommended yet. When you recommend something, it shows here instead of on your board, since you've already tried it.", done: "Nothing finished yet. When you've tried something on the board, mark how it was and it moves here.", hidden: "Nothing here. Tapping “Not for me” on the board takes it off your board only." };
</script>

<svelte:head><title>History · You Should Try…</title></svelte:head>

<h1>History</h1>
<p class="me">You show up as <b>{data.myName}</b>. <a href="/me">Change your name</a></p>
<p class="sub">Things you've recommended, finished or marked not for you. They're off your board, and everyone else still sees them.</p>
<div class="tabs" role="tablist">
  {#each TABS as [v, label]}
    <a href="?v={v}" role="tab" aria-selected={data.view === v}>{label}{#if data.counts[v]}{' '}<span>{data.counts[v]}</span>{/if}</a>
  {/each}
</div>
{#if data.cards.length}
  <div class="list">{#each data.cards as card (card.item.id)}<RecCard {card} />{/each}</div>
{:else}
  <p class="empty">{EMPTY[data.view]}</p>
{/if}

<style>
  h1 { font-size: 24px; margin: 10px 0; }
  .me { margin: -4px 0 8px; color: var(--ink-2); font-size: 14px; }
  .me a { color: var(--ink); font-weight: 700; }
  .sub { color: var(--ink-2); margin: 0 0 12px; }
  .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
  .tabs a { padding: 8px 14px; border-radius: 18px; text-decoration: none; color: var(--ink); font-weight: 600; border: 1.5px solid var(--line); background: var(--surface-2); }
  .tabs a[aria-selected='true'] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .tabs span { opacity: .7; margin-left: 4px; }
  .list { display: grid; gap: 10px; }
  .empty { color: var(--ink-2); padding: 20px 0; }
</style>
