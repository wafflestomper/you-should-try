<script>
  // Genres and moods for a pick, with a way to fix the moods (the AI only guesses)
  import { MOODS, FACET_KINDS } from '$lib/facetTags.js';
  let { item, genres = [], moods = [], byUser = false } = $props();
  let mine = $state(null); // moods after someone fixed them here
  const shown = $derived(mine ?? moods);
  let fixing = $state(false), pick = $state([]), saving = $state(false);
  const allowed = $derived(MOODS.filter((m) => (m === 'Bingeable' ? item.kind === 'tv' : m === 'Page-turner' ? ['book', 'audiobook'].includes(item.kind) : true)));
  function open() { pick = [...shown]; fixing = true; }
  async function save() {
    saving = true;
    const r = await fetch(`/api/facets/${item.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ moods: pick }) }).catch(() => null);
    if (r?.ok) { mine = (await r.json()).moods; fixing = false; }
    saving = false;
  }
</script>

{#if FACET_KINDS.includes(item.kind)}
  <div class="fx">
    {#each genres as g}<a class="tag" href="/?t={encodeURIComponent(g)}">{g}</a>{/each}
    {#each shown as m}<a class="tag mood" href="/?t={encodeURIComponent(m)}">{m}</a>{/each}
    {#if !genres.length && !shown.length}<span class="none">Genres and moods are on the way.</span>{/if}
    <button class="fixb" onclick={() => (fixing ? (fixing = false) : open())} aria-expanded={fixing}>{fixing ? 'Close' : shown.length ? 'Fix moods' : 'Add moods'}</button>
  </div>
  {#if fixing}
    <div class="fixer">
      <p class="small">Pick up to 4 that fit how it feels. {byUser || mine ? '' : 'The ones there now are a computer\'s guess.'}</p>
      <div class="opts">
        {#each allowed as m}
          <button class="tag mood opt" aria-pressed={pick.includes(m)} disabled={!pick.includes(m) && pick.length >= 4} onclick={() => (pick = pick.includes(m) ? pick.filter((x) => x !== m) : [...pick, m])}>{m}</button>
        {/each}
      </div>
      <button class="btn sm" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save moods'}</button>
    </div>
  {/if}
{/if}

<style>
  .fx { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 12px 0 4px; }
  .tag { display: inline-flex; align-items: center; min-height: 32px; padding: 0 12px; border-radius: 999px; border: 1.5px solid var(--line); color: var(--ink); font: 700 13.5px Manrope, sans-serif; text-decoration: none; background: var(--surface); }
  .tag.mood { border-style: dashed; background: none; }
  .none { color: var(--ink-2); font-size: 14px; }
  .fixb { border: 0; background: none; color: var(--ink-2); font: 700 13.5px Manrope, sans-serif; text-decoration: underline; cursor: pointer; min-height: 32px; padding: 0 6px; }
  .fixer { background: var(--surface); border-radius: 14px; padding: 12px; display: grid; gap: 10px; margin: 6px 0 10px; }
  .fixer .small { margin: 0; color: var(--ink-2); font-size: 14px; }
  .opts { display: flex; flex-wrap: wrap; gap: 6px; }
  .opt { cursor: pointer; }
  .opt[aria-pressed='true'] { background: var(--ink); color: var(--bg); border-color: var(--ink); border-style: solid; }
  .opt:disabled { opacity: .4; }
</style>
