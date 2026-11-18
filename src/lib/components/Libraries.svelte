<script>
  // Pick the Libby libraries to check. Search uses the Shelf Check worker; a pasted Libby link works too.
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  let { libs = [], compact = false, label = 'Your Libby libraries', admin = false } = $props();
  let usingDefaults = $derived(libs.length > 0 && libs.every((l) => l.isDefault));

  let q = $state('');
  let results = $state([]);
  let note = $state('');
  let open = $state(false);
  let timer;
  let addForm;
  let pending = $state({ key: '', name: '' });

  function search() {
    clearTimeout(timer);
    const term = q.trim();
    const m = term.match(/libbyapp\.com\/(?:library|search)\/([a-z0-9-]+)/i) || term.match(/^https?:\/\/([a-z0-9-]+)\.overdrive\.com/i);
    if (m) { results = [{ key: m[1].toLowerCase(), name: m[1].toLowerCase() }]; note = ''; open = true; return; }
    if (term.length < 2) { open = false; return; }
    timer = setTimeout(async () => {
      note = 'Searching…'; open = true; results = [];
      try {
        const d = await (await fetch(`/api/libraries?q=${encodeURIComponent(term)}`)).json();
        results = d.libraries || [];
        note = d.note || (results.length ? '' : 'No libraries found. Try the city or county, or paste your Libby library link.');
      } catch { note = 'Library search is not responding right now.'; }
    }, 300);
  }
  async function choose(l) {
    pending = l; open = false; q = '';
    await tick();
    addForm.requestSubmit();
  }
</script>

<div class="libs" class:compact>
  {#if !compact}<div class="lab">{label}</div>{/if}
  {#if usingDefaults && !admin}<div class="sm">Checking the group's libraries. Add or remove one to make the list your own.</div>{/if}
  <div class="row">
    {#each libs as l (l.key)}
      <form method="POST" action="?/removeLib" use:enhance class="chip">
        <input type="hidden" name="key" value={l.key} />
        <span>{l.name}</span><button aria-label="Stop checking {l.name}" title="Remove">×</button>
      </form>
    {/each}
    <div class="search">
      <label class="sr" for="lib-q">Add a library</label>
      <input id="lib-q" bind:value={q} oninput={search} onkeydown={(e) => e.key === 'Escape' && (open = false)}
        placeholder={libs.length ? 'Add another library' : 'Find your library, e.g. Henrico'} autocomplete="off" />
      {#if open}
        <ul class="drop" role="listbox">
          {#each results as l (l.key)}
            <li><button type="button" onclick={() => choose(l)}>{l.name}</button></li>
          {/each}
          {#if note}<li class="note">{note}</li>{/if}
        </ul>
      {/if}
    </div>
  </div>
  {#if !usingDefaults && !admin}
    <form method="POST" action="?/resetLibs" use:enhance class="reset"><button class="rl">Use the group's libraries instead</button></form>
  {/if}
  <form method="POST" action="?/addLib" use:enhance bind:this={addForm} hidden>
    <input name="key" value={pending.key} /><input name="name" value={pending.name} />
  </form>
</div>

<style>
  .libs { margin: 18px 0 6px; }
  .lab { font: 600 14px var(--body); margin-bottom: 6px; }
  .reset { margin-top: 6px; }
  .rl { background: none; border: 0; padding: 0; font: 13px var(--body); color: var(--ink-2); text-decoration: underline; cursor: pointer; }
  .sm { font-size: 13px; color: var(--ink-2); margin: -2px 0 6px; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .chip { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 6px 0 12px; border-radius: 17px; background: var(--green); color: #fff; font: 600 14px var(--body); }
  .chip button { background: none; border: 0; color: #fff; font-size: 18px; cursor: pointer; width: 26px; height: 26px; border-radius: 13px; }
  .chip button:hover, .chip button:focus-visible { background: rgba(255,255,255,.18); }
  .search { position: relative; flex: 0 1 280px; }
  .search input { width: 100%; min-height: 36px; padding: 0 12px; border: 1.5px solid #CFCDC4; border-radius: 18px; font: 14px var(--body); }
  .drop { position: absolute; z-index: 20; top: 40px; left: 0; right: 0; min-width: 260px; list-style: none; margin: 0; padding: 4px; background: #fff; border: 1.5px solid var(--slate); border-radius: 6px; box-shadow: 0 8px 22px rgba(0,0,0,.12); }
  .drop button { width: 100%; text-align: left; padding: 9px 10px; background: none; border: 0; font: 14px var(--body); cursor: pointer; border-radius: 4px; }
  .drop button:hover, .drop button:focus-visible { background: #F3F1EA; }
  .note { padding: 9px 10px; font-size: 13px; color: var(--ink-2); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
