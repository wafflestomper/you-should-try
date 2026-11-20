<script>
  // The top of every signed-out page (sign in, invite, about): the quote headline and three sample cards.
  // Sample cards are well-known titles, no one from the real board.
  import { KIND } from '$lib/kinds.js';
  let { kicker = '', lead = 'The shows, books and places your friends tell you about, saved in one place with who said it.' } = $props();
  const sample = [
    { kind: 'book', title: 'Project Hail Mary', who: 'from a friend at lunch' },
    { kind: 'tv', title: 'Slow Horses', who: 'from the group chat' },
    { kind: 'movie', title: 'Past Lives', who: 'from your neighbor' }
  ];
</script>

<div class="hero">
{#if kicker}<p class="kicker">{kicker}</p>{/if}
<h1>“You should try…”</h1>
<p class="lead">{lead}</p>

<div class="stack" aria-hidden="true">
  {#each sample as c, i}
    <div class="card" style="--c:{KIND[c.kind].color};--soft:{KIND[c.kind].soft};--deep:{KIND[c.kind].deep};--i:{i}">
      <span class="k">{KIND[c.kind].label}</span>
      <span class="w">{c.who}</span>
      <span class="t">{c.title}</span>
    </div>
  {/each}
</div>
</div>

<style>
  .kicker { margin: 0 0 10px; font-weight: 800; color: var(--ink-2); font-size: 16px; }
  h1 { margin: 0; font: italic 400 52px/1 "Instrument Serif", Georgia, serif; letter-spacing: -.01em; }
  .lead { margin: 14px 0 0; font-size: 17px; line-height: 1.5; color: var(--ink-2); max-width: 34ch; }
  .stack { position: relative; height: 246px; margin: 34px 0 30px; }
  .card {
    position: absolute; left: 0; right: 0; top: calc(var(--i) * 70px); height: 104px;
    box-sizing: border-box; padding: 14px 18px; border-radius: 18px;
    background: var(--soft); border: 1px solid color-mix(in srgb, var(--c) 22%, transparent);
    box-shadow: 0 -6px 18px rgba(17, 17, 19, .06);
    display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; column-gap: 12px; align-content: start;
    transform: rotate(calc((var(--i) - 1) * -1.2deg));
  }
  .k { font-size: 12.5px; font-weight: 800; color: var(--deep); }
  .w { font-size: 12.5px; color: color-mix(in srgb, var(--deep) 80%, #555); text-align: right; white-space: nowrap; }
  .t { grid-column: 1 / -1; font: 400 27px/1.1 "Instrument Serif", Georgia, serif; color: #111113; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  :global(.look-dark) .card { background: color-mix(in srgb, var(--c) 18%, #17171B); border-color: color-mix(in srgb, var(--c) 35%, transparent); box-shadow: 0 -6px 18px rgba(0,0,0,.4); }
  :global(.look-dark) .t { color: #F5F5F7; }
  :global(.look-dark) .k, :global(.look-dark) .w { color: color-mix(in srgb, var(--c) 55%, #fff); }
  @media (max-width: 360px) { h1 { font-size: 44px; } }
</style>
