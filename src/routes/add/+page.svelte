<script>
  import { onDestroy, tick } from 'svelte';
  import Cover from '$lib/components/Cover.svelte';
  let { data, form } = $props();

  const KINDS = [['book', 'Book'], ['audiobook', 'Audiobook'], ['tv', 'TV show'], ['movie', 'Movie'], ['podcast', 'Podcast'], ['restaurant', 'Restaurant'], ['recipe', 'Recipe'], ['place', 'Place to go'], ['other', 'Other']];

  // step: start | listening | working | review
  let step = $state('start');
  let typing = $state(false);
  let said = $state('');
  let err = $state('');
  let level = $state(0);

  // Review fields
  let kind = $state('');
  let title = $state('');
  let by = $state('');
  let note = $state('');
  let matches = $state([]);
  let pick = $state(null);
  let searchNote = $state('');

  let known = $derived([...data.members.map((m) => m.name), ...data.guests.map((g) => g.name)]);
  let byStatus = $derived.by(() => {
    const n = by.trim().toLowerCase();
    if (!n || ['me', 'myself', 'i'].includes(n)) return 'You recommended it.';
    if (data.members.some((m) => m.name.toLowerCase() === n || m.name.toLowerCase().split(' ')[0] === n)) return '';
    if (data.guests.some((g) => g.name.toLowerCase() === n)) return `${by.trim()} isn't on here yet. We'll keep this with their other picks.`;
    return `${by.trim()} isn't on here yet. We'll save the name so you can invite them later.`;
  });

  // Is the picked thing already on the board?
  let existing = $derived(pick?.onBoard ?? null);
  let sameAgain = $derived.by(() => {
    if (!existing) return false;
    const n = by.trim().toLowerCase() || data.me.toLowerCase();
    return existing.some((e) => e.name.toLowerCase() === n || e.name.toLowerCase().split(' ')[0] === n.split(' ')[0]);
  });
  const firstName = (n) => n.split(' ')[0];
  function ago(iso) {
    const d = (Date.now() - Date.parse(iso.replace(' ', 'T') + 'Z')) / 864e5;
    return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 30 ? `${Math.floor(d)} days ago` : `${Math.floor(d / 30)} mo ago`;
  }

  /* ---------- Recording: plain WAV, 16 kHz mono, stops itself after a pause ---------- */
  let ctx, stream, proc, srcNode, chunks = [], inRate = 48000, startedAt = 0, lastLoud = 0, heard = false, timer;

  async function startListening() {
    err = '';
    if (!navigator.mediaDevices?.getUserMedia) { err = "This browser can't use the microphone. Type it instead."; typing = true; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      err = 'Microphone is blocked. Allow it in your browser settings, or type it instead.';
      typing = true;
      return;
    }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    inRate = ctx.sampleRate;
    srcNode = ctx.createMediaStreamSource(stream);
    proc = ctx.createScriptProcessor(4096, 1, 1);
    chunks = []; heard = false; startedAt = lastLoud = performance.now();
    proc.onaudioprocess = (e) => {
      const d = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(d));
      let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * d[i];
      const rms = Math.sqrt(s / (d.length / 4));
      level = Math.min(1, rms * 8);
      const now = performance.now();
      if (rms > 0.02) { lastLoud = now; heard = true; }
      if ((heard && now - lastLoud > 1600) || now - startedAt > 20000) stopListening();
    };
    srcNode.connect(proc); proc.connect(ctx.destination);
    step = 'listening';
  }

  function cleanup() {
    try { proc && (proc.onaudioprocess = null); srcNode?.disconnect(); proc?.disconnect(); } catch {}
    stream?.getTracks().forEach((t) => t.stop());
    ctx?.close().catch(() => {});
    proc = srcNode = stream = ctx = null;
  }

  async function stopListening() {
    if (step !== 'listening') return;
    const parts = chunks; cleanup(); level = 0;
    step = 'working';
    if (!heard) { step = 'start'; err = "Didn't hear anything. Tap and try again."; return; }
    const wav = toWav(parts, inRate, 16000);
    try {
      const r = await fetch('/api/transcribe', { method: 'POST', body: wav, headers: { 'Content-Type': 'audio/wav' } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      said = j.text;
      await understand();
    } catch (e) {
      step = 'start'; typing = true;
      err = (e.message || "Voice didn't work this time.") + ' You can type it below.';
    }
  }

  function toWav(parts, from, to) {
    const len = parts.reduce((n, p) => n + p.length, 0);
    const all = new Float32Array(len); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
    const ratio = from / to, outLen = Math.floor(len / ratio), pcm = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const a = Math.floor(i * ratio), b = Math.min(len, Math.floor((i + 1) * ratio));
      let s = 0; for (let j = a; j < b; j++) s += all[j];
      const v = Math.max(-1, Math.min(1, s / Math.max(1, b - a)));
      pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    const buf = new ArrayBuffer(44 + pcm.length * 2), dv = new DataView(buf);
    const w = (p, s) => [...s].forEach((c, i) => dv.setUint8(p + i, c.charCodeAt(0)));
    w(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, to, true);
    dv.setUint32(28, to * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
    new Int16Array(buf, 44).set(pcm);
    return new Blob([buf], { type: 'audio/wav' });
  }

  /* ---------- Turn the sentence into a card ---------- */
  async function understand() {
    err = '';
    if (!said.trim()) { err = 'Say or type what you heard.'; return; }
    step = 'working';
    try {
      const r = await fetch('/api/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: said }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const p = j.parsed;
      kind = p.kind || j.matches[0]?.kind || '';
      title = p.title || said;
      by = p.by ? (p.by.type === 'me' ? '' : p.by.name) : '';
      note = p.note || '';
      matches = j.matches;
      searchNote = j.note || '';
      pick = matches.find((m) => m.title.toLowerCase() === title.toLowerCase()) || (matches.length ? matches[0] : null);
      if (pick && !p.kind) kind = pick.kind;
      step = 'review';
    } catch (e) {
      step = 'start'; typing = true;
      err = e.message || "Couldn't read that. Try typing it.";
    }
  }

  let searchTimer;
  async function researchTitle() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      if (!kind || title.trim().length < 2) return;
      const r = await fetch(`/api/search?kind=${kind}&q=${encodeURIComponent(title)}`);
      if (!r.ok) return;
      const j = await r.json();
      matches = j.results || [];
      searchNote = j.note || '';
      pick = null;
    }, 350);
  }

  function reset() { step = 'start'; said = ''; matches = []; pick = null; kind = title = by = note = ''; err = ''; }
  onDestroy(cleanup);
</script>

<svelte:head><title>You should try… · Add</title></svelte:head>

{#if step === 'start' || step === 'listening'}
  <section class="start">
    <h1>Who said what?</h1>
    <p class="hint">Like: “Warren said read <i>Green Eggs and Ham</i>.”</p>

    <button class="bigmic" class:on={step === 'listening'} style="--lvl:{level}"
      onclick={() => (step === 'listening' ? stopListening() : startListening())}
      aria-label={step === 'listening' ? 'Stop and use what I said' : 'Tap and say it'}>
      <svg viewBox="0 0 24 24" width="64" height="64" aria-hidden="true"><path fill="currentColor" d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6-3.5a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.59a6 6 0 0 0 5-5.91Z"/></svg>
    </button>
    <p class="status" aria-live="polite">{step === 'listening' ? 'Listening… stops when you pause' : 'Tap and say it'}</p>

    {#if err}<p class="err" role="alert">{err}</p>{/if}

    {#if typing}
      <form class="typed" onsubmit={(e) => { e.preventDefault(); understand(); }}>
        <label for="said">Type it the way you'd say it</label>
        <input id="said" bind:value={said} placeholder="Warren said read Green Eggs and Ham" autocomplete="off" />
        <button class="btn dark">Next</button>
      </form>
    {:else}
      <button class="lnk" onclick={async () => { typing = true; await tick(); document.getElementById('said')?.focus(); }}>or type it</button>
    {/if}
  </section>
{:else if step === 'working'}
  <section class="start"><div class="spin" aria-hidden="true"></div><p class="status" aria-live="polite">Filling it in…</p>{#if said}<p class="heard">“{said}”</p>{/if}</section>
{:else}
  <form method="POST" action="?/save" class="review">
    {#if said}<p class="heard">You said: “{said}”</p>{/if}
    {#if form?.error}<p class="err" role="alert">{form.error}</p>{/if}

    <fieldset>
      <legend>What is it?</legend>
      <div class="kinds">
        {#each KINDS as [k, label]}
          <label class="kchip"><input type="radio" name="kind" value={k} bind:group={kind} onchange={researchTitle} />{label}</label>
        {/each}
      </div>
    </fieldset>

    <label class="f" for="title">Title or name</label>
    <input id="title" name="title" bind:value={title} oninput={researchTitle} required />

    {#if matches.length}
      <div class="matches" role="radiogroup" aria-label="Pick the right one">
        {#each matches as m, i (i)}
          <button type="button" class="match" class:sel={pick === m} role="radio" aria-checked={pick === m} onclick={() => { pick = m; title = m.title; if (m.kind) kind = m.kind; }}>
            <Cover title={m.title} kind={m.kind} image={m.image_url} w={44} />
            <span><b>{m.title}</b><br /><span class="m2">{[m.creator, m.year].filter(Boolean).join(', ')}</span>{#if m.onBoard}<br /><span class="ob">On the board from {m.onBoard.map((e) => firstName(e.name)).join(', ')}</span>{/if}</span>
          </button>
        {/each}
        <button type="button" class="match plain" class:sel={!pick} role="radio" aria-checked={!pick} onclick={() => (pick = null)}>None of these. Use “{title}”.</button>
      </div>
    {:else if searchNote}<p class="m2">{searchNote}</p>{/if}

    <label class="f" for="by">Who recommended it?</label>
    <input id="by" name="by" bind:value={by} list="people" placeholder="Leave blank if it's you" autocomplete="off" />
    <datalist id="people">{#each known as n}<option value={n}></option>{/each}</datalist>
    {#if byStatus}<p class="m2">{byStatus}</p>{/if}

    <label class="f" for="note">Anything to remember? <span class="m2">(optional)</span></label>
    <input id="note" name="note" bind:value={note} placeholder="Get the mole enchiladas. Skip season 1." maxlength="300" />

    {#if existing}
      <div class="already" role="status">
        {#if sameAgain}
          <b>{by.trim() || 'You'} already recommended this</b> ({ago(existing.find((e) => e.name.toLowerCase().split(' ')[0] === (by.trim() || data.me).toLowerCase().split(' ')[0])?.at ?? existing[0].at)}). Saving just updates the note.
        {:else}
          <b>Already on the board.</b> {existing.map((e) => firstName(e.name)).join(' and ')} recommended it {ago(existing[existing.length - 1].at)}. Saving adds {by.trim() ? firstName(by.trim()) : 'you'} to the same card, and it moves up the board.
        {/if}
      </div>
    {/if}

    <input type="hidden" name="pick" value={pick ? JSON.stringify(pick) : '{}'} />
    <div class="row">
      <button class="btn dark big">{existing ? (sameAgain ? 'Update the note' : `Add ${by.trim() ? firstName(by.trim()) : 'me'} to it`) : 'Put it on the board'}</button>
      <button type="button" class="lnk" onclick={reset}>Start over</button>
    </div>
  </form>
{/if}

<style>
  .start { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 0; }
  h1 { margin: 6px 0 4px; font-size: 26px; }
  .hint { margin: 0 0 26px; color: var(--ink-2); }
  .bigmic { width: 170px; height: 170px; border-radius: 50%; border: 0; background: var(--accent); color: #fff; cursor: pointer; display: grid; place-items: center;
    box-shadow: 0 0 0 calc(var(--lvl) * 26px) rgba(47, 93, 80, .22); transition: box-shadow .08s linear, transform .15s; }
  .bigmic:active { transform: scale(.97); }
  .bigmic.on { background: #B42318; box-shadow: 0 0 0 calc(8px + var(--lvl) * 30px) rgba(180, 35, 24, .2); }
  .status { margin: 16px 0 4px; font-weight: 600; font-size: 17px; }
  .lnk { background: none; border: 0; color: var(--ink-2); text-decoration: underline; font: inherit; cursor: pointer; padding: 10px; }
  .typed { width: 100%; max-width: 520px; display: grid; gap: 8px; text-align: left; margin-top: 18px; }
  .typed label, .f { font-weight: 700; font-size: 15px; }
  input:not([type=radio]) { min-height: 48px; border: 1.5px solid #CFCDC4; border-radius: 10px; padding: 0 12px; font: 17px var(--body); background: #fff; width: 100%; box-sizing: border-box; }
  .err { color: #B42318; font-weight: 600; max-width: 520px; }
  .heard { color: var(--ink-2); font-style: italic; }
  .spin { width: 54px; height: 54px; border-radius: 50%; border: 5px solid #DDE7E2; border-top-color: var(--accent); animation: sp .8s linear infinite; margin-top: 60px; }
  @keyframes sp { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spin { animation-duration: 3s; } .bigmic { transition: none; } }
  .review { display: grid; gap: 8px; max-width: 620px; margin: 0 auto; }
  fieldset { border: 0; padding: 0; margin: 0; }
  legend { font-weight: 700; font-size: 15px; margin-bottom: 6px; }
  .kinds { display: flex; flex-wrap: wrap; gap: 6px; }
  .kchip { display: inline-flex; align-items: center; min-height: 38px; padding: 0 12px; border-radius: 19px; border: 1.5px solid #D6D4CC; background: #fff; font-weight: 600; font-size: 14.5px; cursor: pointer; }
  .kchip input { position: absolute; opacity: 0; pointer-events: none; }
  .kchip:has(input:checked) { background: var(--ink); color: #fff; border-color: var(--ink); }
  .kchip:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
  .f { margin-top: 10px; }
  .matches { display: grid; gap: 6px; }
  .match { display: flex; gap: 10px; align-items: center; text-align: left; padding: 8px; border: 1.5px solid #E2E0D8; border-radius: 10px; background: #fff; cursor: pointer; font: inherit; color: inherit; }
  .match.sel { border-color: var(--accent); background: #EEF5F1; }
  .match.plain { padding: 12px; color: var(--ink-2); }
  .m2 { color: var(--ink-2); font-size: 14px; margin: 0; }
  .ob { color: var(--accent); font-weight: 600; font-size: 13.5px; }
  .already { background: #FFF6DB; border: 1px solid #E9D18A; border-radius: 10px; padding: 12px 14px; font-size: 15px; margin-top: 8px; }
  .row { display: flex; gap: 12px; align-items: center; margin-top: 16px; }
  .big { min-height: 52px; font-size: 17px; flex: 1; }
</style>
