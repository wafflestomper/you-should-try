<script>
  import { invalidateAll } from '$app/navigation';
  import { VIDEO_TOPICS } from '$lib/videoTopics.js';

  let file = $state(null), title = $state(''), topic = $state(''), blurb = $state('');
  let stage = $state(''), pct = $state(0), err = $state(''), note = $state('');
  let busy = $derived(!!stage && stage !== 'done');
  const PART = 8 * 1024 * 1024;
  const mb = (n) => `${(n / 1048576).toFixed(n > 1e8 ? 0 : 1)} MB`;

  // Shrink to a phone-friendly MP4 in the browser (long side 1280, about 2 Mbps). Falls back to the original if this browser can't.
  async function shrink(f) {
    try {
      const M = await import('mediabunny');
      if (!(await M.canEncodeVideo('avc'))) return null;
      const input = new M.Input({ source: new M.BlobSource(f), formats: M.ALL_FORMATS });
      const track = await input.getPrimaryVideoTrack();
      if (!track) return null;
      const w = track.displayWidth, h = track.displayHeight, scale = Math.min(1, 1280 / Math.max(w, h));
      const size = w >= h ? { width: Math.round((w * scale) / 2) * 2 } : { height: Math.round((h * scale) / 2) * 2 };
      const output = new M.Output({ format: new M.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new M.BufferTarget() });
      const conv = await M.Conversion.init({ input, output, video: { codec: 'avc', bitrate: 2_000_000, ...size } });
      // Narration must survive: if the sound can't be carried over, keep the original instead
      if (conv.discardedTracks.some((d) => d.track.type === 'audio')) return null;
      if (!conv.isValid) return null;
      conv.onProgress = (p) => (pct = Math.round(p * 100));
      await conv.execute();
      const out = new Blob([output.target.buffer], { type: 'video/mp4' });
      return out.size < f.size ? out : null;
    } catch (e) {
      console.warn('shrink failed', e);
      return null;
    }
  }

  // Cover picture and length, taken from the video itself
  function inspect(blob) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      const url = URL.createObjectURL(blob);
      const finish = (poster) => { URL.revokeObjectURL(url); resolve({ poster, seconds: v.duration || 0, width: v.videoWidth, height: v.videoHeight }); };
      v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 3); };
      v.onseeked = () => {
        const s = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => finish(b), 'image/jpeg', 0.8);
      };
      v.onerror = () => finish(null);
      setTimeout(() => finish(null), 15000);
      v.src = url;
    });
  }

  let step = '';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Each request gets three tries: phone connections drop for a second all the time
  async function call(method, qs, body, isJson = true) {
    let last;
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(`/api/videos?${new URLSearchParams(qs)}`, { method, body: isJson ? JSON.stringify(body) : body, headers: isJson ? { 'content-type': 'application/json' } : {} });
        if (r.ok) return r.json();
        last = new Error((await r.json().catch(() => ({}))).message || `the server said ${r.status}`);
        if (r.status < 500) break;
      } catch (e) { last = e; }
      await wait(1500 * (i + 1));
    }
    throw last;
  }
  // Keep the screen awake: a locked phone cuts the upload off
  let lock = null;
  async function stayAwake(on) {
    try { if (on) lock = await navigator.wakeLock?.request('screen'); else { await lock?.release(); lock = null; } } catch {}
  }

  async function go(e) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    err = ''; note = ''; pct = 0;
    let up = null;
    await stayAwake(true);
    try {
      // Read the whole file now, while the phone still lets us (picked files can stop being readable later)
      step = 'reading the video from your phone';
      stage = 'shrink';
      const copy = new Blob([await file.arrayBuffer()], { type: file.type || 'video/mp4' });
      step = 'shrinking it';
      const small = await shrink(copy);
      const blob = small ?? copy;
      note = small ? `Shrunk from ${mb(file.size)} to ${mb(small.size)}.` : `Kept the original (${mb(file.size)}).`;
      step = 'making the cover picture';
      const info = await inspect(blob);
      stage = 'upload'; pct = 0;
      step = 'uploading the cover picture';
      const poster = info.poster ? (await call('PUT', { op: 'poster' }, info.poster, false)).key : null;
      step = 'starting the upload';
      up = await call('POST', { op: 'start' }, { type: blob.type || 'video/mp4' });
      const parts = [];
      const count = Math.ceil(blob.size / PART);
      for (let i = 0; i < count; i++) {
        step = `uploading piece ${i + 1} of ${count}`;
        parts.push(await call('PUT', { op: 'part', key: up.key, uploadId: up.uploadId, n: i + 1 }, blob.slice(i * PART, (i + 1) * PART), false));
        pct = Math.round(((i + 1) / count) * 100);
      }
      step = 'finishing up';
      await call('POST', { op: 'done' }, { ...up, parts, title, topic, blurb, poster, bytes: blob.size, seconds: info.seconds, width: info.width, height: info.height });
      stage = 'done';
      file = null; title = ''; blurb = ''; topic = '';
      e.target.reset();
      await invalidateAll();
    } catch (x) {
      if (up) call('POST', { op: 'abort' }, up).catch(() => {});
      err = `It stopped while ${step}${x?.message ? ` (${x.message})` : ''}. ${note} Try again, and keep this screen open.`;
      stage = '';
    } finally {
      stayAwake(false);
    }
  }
</script>

<form class="vu" onsubmit={go}>
  <label class="pick">
    <input type="file" accept="video/*" required disabled={busy} onchange={(e) => { file = e.currentTarget.files?.[0] ?? null; stage = ''; note = ''; }} />
    <span>{file ? `${file.name} · ${mb(file.size)}` : 'Choose a video from your phone'}</span>
  </label>
  <label>Title<input bind:value={title} required maxlength="80" placeholder="Track a show you're watching" disabled={busy} /></label>
  <label>One line about it (optional)<input bind:value={blurb} maxlength="200" placeholder="Mark episodes and see what's next" disabled={busy} /></label>
  <label>Show a "Show me" link on
    <select bind:value={topic} disabled={busy}>
      {#each VIDEO_TOPICS as [k, label]}<option value={k}>{k ? label : 'Nowhere, just the How-to page'}</option>{/each}
    </select>
  </label>
  {#if busy}
    <div class="prog" role="status">
      <span>{stage === 'shrink' ? 'Shrinking it for phones' : 'Uploading'}… {pct}%</span>
      <i style="width:{pct}%"></i>
    </div>
    <p class="small muted">Keep this screen open and don't switch apps until it finishes.</p>
  {:else}
    <button class="btn" disabled={!file || !title.trim()}>Add video</button>
  {/if}
  {#if stage === 'done'}<p class="ok">Added. {note}</p>{/if}
  {#if err}<p class="bad">{err}</p>{/if}
</form>

<style>
  .vu { display: grid; gap: 10px; }
  .vu label { display: grid; gap: 4px; font-weight: 700; font-size: 14px; }
  .vu input:not([type='file']), .vu select { min-height: 46px; border-radius: 12px; border: 1px solid var(--line); padding: 0 12px; font: 16px Manrope, sans-serif; background: var(--surface-2); color: var(--ink); }
  .pick { position: relative; min-height: 56px; border: 2px dashed var(--line); border-radius: 14px; display: grid !important; place-items: center; text-align: center; padding: 10px; cursor: pointer; }
  .pick input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .prog { position: relative; height: 40px; border-radius: 12px; background: var(--surface-2); overflow: hidden; display: grid; place-items: center; font-weight: 800; font-size: 14px; }
  .prog i { position: absolute; left: 0; top: 0; bottom: 0; background: color-mix(in srgb, #0D9488 30%, transparent); transition: width .3s; }
  .prog span { position: relative; }
  .ok { color: #0D9488; font-weight: 700; margin: 0; }
  .bad { color: #E11D48; font-weight: 700; margin: 0; }
</style>
