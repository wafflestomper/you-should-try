<script>
  import { enhance } from '$app/forms';
  import { taps, setTaps } from '$lib/taps.svelte.js';
  let { data, form } = $props();
</script>
<svelte:head><title>Your profile · You Should Try</title></svelte:head>

<h1>Your profile</h1>
<form method="POST" action="?/save" use:enhance={() => async ({ update }) => update({ reset: false })} class="pf">
  <label for="name">Your name on the board</label>
  <input id="name" name="name" value={data.me.name} maxlength="40" required autocomplete="nickname" />
  <p class="hint">This is what everyone sees on your recommendations. A nickname is fine. If someone else has the same first name, the board adds a last initial so you can tell each other apart, so include your last name if you want that to work.</p>

  <label for="how">How people know you <span class="opt">(optional)</span></label>
  <input id="how" name="how_known" value={data.me.how_known} maxlength="40" placeholder="St. Chris, tennis, church…" />

  {#if form?.error}<p class="err" role="alert">{form.error}</p>{/if}
  {#if form?.saved}<p class="ok" role="status">Saved.</p>{/if}
  <button class="btn dark">Save</button>
</form>
{#if data.me.email}<p class="hint">Signed in as {data.me.email}</p>{/if}

<section class="rec">
  <h2>Recording a how-to video</h2>
  <label class="sw">
    <input type="checkbox" role="switch" checked={taps.on} onchange={(e) => setTaps(e.currentTarget.checked)} />
    <span class="track" aria-hidden="true"><span class="knob"></span></span>
    <span><b>Show my taps</b><span class="hint sub">A circle appears wherever you touch, and a trail when you swipe, so people watching your screen recording can follow along. Only on this phone, and only you see it.</span></span>
  </label>
  <p class="hint">{taps.on ? 'On. Try tapping anywhere.' : 'Off.'} You can also turn it on or off from the link at the bottom of any page.</p>
</section>

<style>
  h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 14px 0 12px; }
  .pf { display: grid; gap: 6px; max-width: 520px; }
  label { font-weight: 800; font-size: 15px; margin-top: 10px; }
  input { min-height: 48px; border-radius: 12px; border: 1px solid var(--line); padding: 0 12px; font: 17px Manrope, sans-serif; }
  .hint { color: var(--ink-2); font-size: 13.5px; margin: 2px 0 0; max-width: 60ch; }
  .opt { font-weight: 600; color: var(--ink-3); }
  .btn { min-height: 48px; margin-top: 14px; justify-self: start; padding: 0 28px; }
  .err { color: #B42318; font-weight: 700; }
  .ok { color: #1F7A4A; font-weight: 700; }
  .rec { margin-top: 34px; max-width: 520px; }
  h2 { font-size: 18px; font-weight: 800; margin: 0 0 10px; }
  .sw { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; cursor: pointer; margin: 0; font-weight: 400; }
  .sw input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .track { width: 50px; height: 30px; border-radius: 999px; background: var(--line); position: relative; transition: background .2s; margin-top: 2px; }
  .knob { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .2s; }
  .sw input:checked + .track { background: #2563EB; }
  .sw input:checked + .track .knob { transform: translateX(20px); }
  .sw input:focus-visible + .track { outline: 3px solid #2563EB; outline-offset: 2px; }
  .sub { display: block; margin-top: 2px; }
</style>
