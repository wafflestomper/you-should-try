<script>
  // Finds where a new item belongs with as few matchups as possible.
  // A full list makes it beat the No. 10 first; after that it narrows from the middle.
  import Cover from './Cover.svelte';
  import Corners from './Corners.svelte';
  let { top = [], item, listTitle = 'your list', onplace, oncancel } = $props();

  const n = top.length;
  let lo = $state(0);
  let hi = $state(n >= 10 ? 9 : n);
  let gate = $state(n >= 10);
  let round = $state(0);
  let picking = $state(false);
  let placing = $state(false);
  let flash = $state(null);
  const total = n >= 10 ? 1 + Math.ceil(Math.log2(10)) : Math.ceil(Math.log2(n + 1));
  let mid = $derived(gate ? 9 : Math.floor((lo + hi) / 2));
  let rival = $derived(top[mid]?.item);

  function choose(newWins) {
    if (picking) return;
    picking = true;
    flash = newWins ? 'new' : 'old';
    setTimeout(() => {
      picking = false; flash = null; round += 1;
      if (gate) {
        gate = false;
        if (!newWins) return onplace(-1);
        lo = 0; hi = 9;
        return;
      }
      if (newWins) hi = mid; else lo = mid + 1;
      if (lo >= hi) onplace(lo);
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
  }
  function key(e) {
    if (placing) return;
    if (e.key === 'ArrowLeft') choose(true);
    if (e.key === 'ArrowRight') choose(false);
    if (e.key === 'Escape') oncancel();
  }
  const sub = (it) => [it.creator, it.narrator ? `read by ${it.narrator}` : null].filter(Boolean).join(' · ');
</script>

<svelte:window onkeydown={key} />

<div class="overlay" role="dialog" aria-modal="true" aria-label="Face-off">
  <div class="frame"><div class="board inner"><Corners size={64} />
    {#if placing}
      <div class="head"><div class="script" style="font-size:32px">Where does it go?</div>
        <p class="hint">{item.title} goes in at the spot you pick. Everything below moves down one.</p></div>
      <div class="grid">
        {#each Array.from({ length: Math.min(n + 1, 10) }) as _, i}
          <button class="slab spot" onclick={() => onplace(i)} aria-label="Put it at number {i + 1}">{i + 1}</button>
        {/each}
      </div>
      <div class="foot"><button class="btn chalk sm" onclick={() => (placing = false)}>Back to face-offs</button></div>
    {:else}
      <div class="head">
        <div class="cap" style="font-size:12px;color:var(--chalk-2)">Placing a new pick in {listTitle}</div>
        <h2><span class="script" style="font-size:40px">{gate ? 'Does it beat' : 'Did you like it better than'}</span><br /><span class="slab" style="font-size:46px">your No. {mid + 1}?</span></h2>
        {#if gate}<p class="hint">It has to win this one to make your top 10.</p>{:else}<p class="hint">No ties. You have to pick.</p>{/if}
      </div>
      <div class="arena">
        <button class="pick" class:win={flash === 'new'} class:lose={flash === 'old'} onclick={() => choose(true)}>
          <Cover title={item.title} kind={item.kind} image={item.image_url} w={150} />
          <span class="cap tag new">New</span><span class="nm">{item.title}</span><span class="meta">{sub(item)}</span>
        </button>
        <span class="script or" aria-hidden="true">or</span>
        <button class="pick" class:win={flash === 'old'} class:lose={flash === 'new'} onclick={() => choose(false)}>
          <Cover title={rival.title} kind={rival.kind} image={rival.image_url} w={150} />
          <span class="cap tag">Your No. {mid + 1}</span><span class="nm">{rival.title}</span><span class="meta">{sub(rival)}</span>
        </button>
      </div>
      <div class="foot">
        <div class="pips" aria-label="Matchup {round + 1} of about {Math.max(total, round + 1)}">
          {#each Array.from({ length: Math.max(total, round + 1) }) as _, i}<span class:done={i < round} class:now={i === round}></span>{/each}
        </div>
        <span class="hint">Matchup {round + 1} of about {Math.max(total, round + 1)} · arrow keys work too</span>
        <div class="row"><button class="btn chalk sm" onclick={() => (placing = true)}>Place it myself</button><button class="btn chalk sm dim" onclick={oncancel}>Cancel</button></div>
      </div>
    {/if}
  </div></div>
</div>

<style>
  .overlay { position: fixed; inset: 0; z-index: 60; background: rgba(20,22,21,.55); display: flex; align-items: center; justify-content: center; padding: 16px; overflow: auto; }
  .frame { max-width: 860px; width: 100%; }
  .inner { padding: 28px 30px 24px; text-align: center; }
  .head, .arena, .foot, .grid { position: relative; }
  h2 { margin: 6px 0 0; font-weight: 400; line-height: 1.05; }
  .hint { color: var(--chalk-2); font-size: 14px; margin: 8px 0 0; }
  .arena { display: flex; justify-content: center; align-items: center; gap: 20px; margin: 18px 0 10px; flex-wrap: wrap; }
  .pick { background: transparent; border: 2px solid transparent; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--chalk); cursor: pointer; width: 250px; transition: transform .25s, opacity .25s, border-color .15s; }
  .pick:hover { border-color: rgba(241,240,234,.5); }
  .pick.win { transform: scale(1.05); border-color: var(--chalk-yellow); }
  .pick.lose { opacity: .3; transform: scale(.94); }
  .tag { font-size: 11px; background: var(--chalk-yellow); color: var(--slate); padding: 3px 9px; border-radius: 3px; }
  .tag.new { background: var(--chalk); }
  .nm { font: 700 20px var(--caps); line-height: 1.2; }
  .meta { font-size: 13.5px; color: var(--chalk-2); }
  .or { font-size: 34px; color: var(--chalk-2); }
  .foot { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .pips { display: flex; gap: 6px; }
  .pips span { width: 26px; height: 5px; border-radius: 3px; background: rgba(241,240,234,.3); }
  .pips .done { background: var(--chalk); } .pips .now { background: var(--chalk-yellow); }
  .row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
  .dim { border-color: rgba(241,240,234,.4); color: var(--chalk-2); }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 22px 0; }
  .spot { width: 54px; height: 50px; border-radius: 8px; border: 2px solid var(--chalk); background: transparent; color: var(--chalk); font-size: 22px; cursor: pointer; }
  .spot:hover { background: var(--chalk); color: var(--slate); }
  @media (max-width: 640px) { .pick { width: 100%; flex-direction: row; text-align: left; } .or { font-size: 24px; } .inner { padding: 20px 16px; } }
</style>
