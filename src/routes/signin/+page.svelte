<script>
  import Logo from '$lib/components/Logo.svelte';
  import { KIND } from '$lib/kinds.js';
  let { data } = $props();
  // Sample cards for the picture only. Well-known titles, no one from the real board.
  const sample = [
    { kind: 'book', title: 'Project Hail Mary', who: 'from a friend at lunch' },
    { kind: 'tv', title: 'Slow Horses', who: 'from the group chat' },
    { kind: 'movie', title: 'Past Lives', who: 'from your neighbor' }
  ];
</script>

<svelte:head><title>Sign in · You Should Try</title></svelte:head>

<div class="look-{data.look ?? 'light'} page">
  <header><Logo size={34} tone={data.look === 'dark' ? 'light' : 'ink'} /></header>

  <h1>“You should try…”</h1>
  <p class="lead">The shows, books and places your friends tell you about, saved in one place with who said it.</p>

  <div class="stack" aria-hidden="true">
    {#each sample as c, i}
      <div class="card" style="--c:{KIND[c.kind].color};--soft:{KIND[c.kind].soft};--deep:{KIND[c.kind].deep};--i:{i}">
        <span class="k">{KIND[c.kind].label}</span>
        <span class="w">{c.who}</span>
        <span class="t">{c.title}</span>
      </div>
    {/each}
  </div>

  {#if data.error}<p class="err" role="alert">{data.error}</p>{/if}
  {#if data.googleReady}
    <a class="gbtn" href="/auth/google">
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      {data.guest ? 'Keep your lists: sign in with Google' : 'Sign in with Google'}
    </a>
  {:else}
    <p class="note">Google sign-in isn't switched on yet.</p>
  {/if}
  <p class="note">It's invite only. New here? Open the invite link a friend sent you, or <a href="/request">request an invite</a>. <a href="/about">What is this?</a></p>
  <p class="note small"><a href="/privacy">Privacy</a></p>
  {#if data.dev}
    <p class="note">Local testing: <a href="/auth/dev?user=u-z">sign in as Z</a> · <a href="/auth/dev?user=u-sarah">as Sarah</a></p>
  {/if}
</div>

<style>
  .page { max-width: 440px; margin: 0 auto; padding: 18px 4px 40px; color: var(--ink); display: flex; flex-direction: column; }
  header { margin-bottom: 40px; }
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
  .look-dark .card { background: color-mix(in srgb, var(--c) 18%, #17171B); border-color: color-mix(in srgb, var(--c) 35%, transparent); box-shadow: 0 -6px 18px rgba(0,0,0,.4); }
  .look-dark .t { color: #F5F5F7; }
  .look-dark .k, .look-dark .w { color: color-mix(in srgb, var(--c) 55%, #fff); }

  .gbtn { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 54px; border-radius: 999px;
    background: var(--ink); color: var(--bg); font-weight: 800; font-size: 17px; text-decoration: none; }
  .gbtn svg { background: #fff; border-radius: 50%; padding: 4px; box-sizing: content-box; }
  .gbtn:hover { opacity: .92; color: var(--bg); }
  .gbtn:focus-visible { outline: 3px solid #2563EB; outline-offset: 3px; }
  .note { color: var(--ink-2); font-size: 14px; margin: 14px 0 0; text-align: center; }
  .note a { color: var(--ink); font-weight: 700; }
  .note.small { font-size: 13px; margin-top: 22px; }
  .note.small a { font-weight: 600; color: var(--ink-2); }
  .err { background: #FBE9E7; color: #8C1D18; padding: 12px 14px; border-radius: 12px; margin: 0 0 14px; font-weight: 600; }
  @media (max-width: 360px) { h1 { font-size: 44px; } }
</style>
