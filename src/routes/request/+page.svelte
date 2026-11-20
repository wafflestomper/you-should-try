<script>
  import Logo from '$lib/components/Logo.svelte';
  import { enhance } from '$app/forms';
  let { data, form } = $props();
  let busy = $state(false);
</script>

<svelte:head><title>Request an invite · You Should Try</title></svelte:head>

<div class="look-{data.look ?? 'light'} page">
  <header><a href="/signin" aria-label="Back to sign in"><Logo size={34} tone={data.look === 'dark' ? 'light' : 'ink'} /></a></header>

  {#if form?.sent}
    <h1>Thanks.</h1>
    <p class="lead">Your request is in. If Z sends you an invite, it'll come to the email you gave, with a link to join.</p>
    <a class="back" href="/signin">Back to sign in</a>
  {:else}
    <h1>Request an invite</h1>
    <p class="lead">You Should Try is for a group of friends and coworkers. Tell Z who you are and who you know here. <a href="/about">What is this?</a></p>

    <form method="POST" class="f" use:enhance={() => { busy = true; return async ({ update }) => { await update({ reset: false }); busy = false; }; }}>
      <label for="r-name">Your name</label>
      <input id="r-name" name="name" value={form?.name ?? ''} maxlength="60" autocomplete="name" required />
      <label for="r-email">Your email</label>
      <input id="r-email" name="email" type="email" value={form?.email ?? ''} maxlength="120" autocomplete="email" required />
      <span class="hint">Use the Google account you'll sign in with, if you have one.</span>
      <label for="r-knows">Who do you know here?</label>
      <input id="r-knows" name="knows" value={form?.knows ?? ''} maxlength="140" placeholder="I teach with Z at St. Chris" required />
      <label for="r-note">Anything else <span class="opt">(optional)</span></label>
      <textarea id="r-note" name="note" maxlength="400" rows="3">{form?.note ?? ''}</textarea>
      <div class="hp" aria-hidden="true"><label for="r-site">Website</label><input id="r-site" name="website" tabindex="-1" autocomplete="off" /></div>
      {#if form?.message}<p class="err" role="alert">{form.message}</p>{/if}
      <button class="go" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
    </form>
    <p class="note">Already have an invite? Open the link from it. <a href="/signin">Sign in</a></p>
  {/if}
</div>

<style>
  .page { max-width: 440px; margin: 0 auto; padding: 18px 4px 40px; color: var(--ink); }
  header { margin-bottom: 34px; }
  header a { text-decoration: none; }
  h1 { margin: 0; font-size: 32px; line-height: 1.1; font-weight: 800; letter-spacing: -.025em; }
  .lead { margin: 12px 0 22px; font-size: 17px; line-height: 1.5; color: var(--ink-2); }
  .f { display: grid; gap: 6px; }
  label { font-weight: 800; font-size: 14.5px; margin-top: 10px; }
  .opt { font-weight: 600; color: var(--ink-3); }
  input, textarea { min-height: 48px; border-radius: 12px; border: 1px solid var(--line); padding: 0 12px; font: 16px Manrope, sans-serif; background: var(--surface-2, #fff); color: var(--ink); box-sizing: border-box; width: 100%; }
  textarea { padding: 12px; resize: vertical; }
  .hint { color: var(--ink-2); font-size: 13px; }
  .hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
  .go { margin-top: 18px; min-height: 54px; border-radius: 999px; border: 0; background: var(--ink); color: var(--bg); font: 800 17px Manrope, sans-serif; cursor: pointer; }
  .go:disabled { opacity: .6; }
  .go:focus-visible { outline: 3px solid #2563EB; outline-offset: 3px; }
  .err { background: #FBE9E7; color: #8C1D18; padding: 12px 14px; border-radius: 12px; margin: 8px 0 0; font-weight: 600; }
  .note { color: var(--ink-2); font-size: 14px; margin: 18px 0 0; text-align: center; }
  .note a, .back { color: var(--ink); font-weight: 700; }
  .back { display: inline-block; margin-top: 4px; }
</style>
