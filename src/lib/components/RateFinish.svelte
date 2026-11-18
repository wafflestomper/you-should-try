<script>
  // "You finished it. How was it?" then, for a show nobody has put on the board, whether to recommend it.
  // The answer shows right away; it's saved behind it.
  import { showToast } from '$lib/toast.svelte.js';
  let { itemId, title, onBoard = false, ondone = () => {}, compact = false } = $props();
  let step = $state('ask'), reaction = $state(null);

  function choose(r) {
    reaction = r;
    if ((r === 'loved' || r === 'liked') && !onBoard) step = 'share';
    else finish(false);
  }
  function finish(share) {
    const r = reaction;
    ondone(r);
    const said = r === 'loved' ? 'You loved' : r === 'liked' ? 'You liked' : 'Not for you:';
    showToast(share ? `${title} is on the board. Thanks for the pick.` : `${said} ${title}.`);
    fetch(`/api/tv/${itemId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'rate', reaction: r, share }) })
      .then((x) => { if (!x.ok) throw new Error(); })
      .catch(() => showToast(`Couldn't save your rating for ${title}. Try again from its page.`));
  }
</script>

<div class="rf" class:compact>
  {#if step === 'ask'}
    <p class="q">{compact ? 'How was it?' : `You finished ${title}. How was it?`}</p>
    <div class="row">
      <button class="btn dark" onclick={() => choose('loved')}>Loved it</button>
      <button class="btn" onclick={() => choose('liked')}>Liked it</button>
      <button class="btn" onclick={() => choose('not_for_me')}>Not for me</button>
    </div>
  {:else}
    <p class="q">Put it on the board so everyone sees you recommend it?</p>
    <div class="row">
      <button class="btn dark" onclick={() => finish(true)}>Yes, recommend it</button>
      <button class="btn" onclick={() => finish(false)}>Just for me</button>
    </div>
  {/if}
</div>

<style>
  .rf { display: grid; gap: 10px; }
  .q { margin: 0; font-weight: 700; }
  .compact .q { font-size: 14px; color: var(--ink-2); font-weight: 600; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
  .row .btn { min-height: 44px; padding: 0 14px; }
  .compact .row .btn { min-height: 40px; padding: 0 12px; font-size: 14px; }
</style>
