<script>
  import Logo from '$lib/components/Logo.svelte';
  import SignedOutHero from '$lib/components/SignedOutHero.svelte';
  import Welcome from '$lib/components/Welcome.svelte';
  import OgTags from '$lib/components/OgTags.svelte';
  let { data } = $props();
</script>

<svelte:head><title>Sign in · You Should Try</title></svelte:head>
<OgTags />

<div class="look-{data.look ?? 'light'} page">
  <header><Logo size={34} tone={data.look === 'dark' ? 'light' : 'ink'} /></header>

  <SignedOutHero />

  {#if data.error}<p class="err" role="alert">{data.error}</p>{/if}
  {#if data.googleReady}
    <a class="gbtn" href="/auth/google">
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      {data.guest ? 'Keep your lists: sign in with Google' : 'Sign in with Google'}
    </a>
  {:else}
    <p class="note">Google sign-in isn't switched on yet.</p>
  {/if}
  <p class="note">It's invite only. New here? Open the invite link a friend sent you, or <a href="/request">request an invite</a>. <a href="#how-h">See how it works</a></p>
  {#if !data.guest}
    <Welcome />
    <p class="note end">Want in? Ask the friend who told you about it, or <a href="/request">request an invite</a>. Already invited? <a href="/auth/google">Sign in with Google</a>.</p>
  {/if}
  <p class="note small"><a href="/privacy">Privacy</a></p>
  {#if data.dev}
    <p class="note">Local testing: <a href="/auth/dev?user=u-z">sign in as Z</a> · <a href="/auth/dev?user=u-sarah">as Sarah</a></p>
  {/if}
</div>

<style>
  .page { max-width: 440px; margin: 0 auto; padding: 18px 4px 40px; color: var(--ink); display: flex; flex-direction: column; }
  header { margin-bottom: 40px; }

  .gbtn { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 54px; border-radius: 999px;
    background: var(--ink); color: var(--bg); font-weight: 800; font-size: 17px; text-decoration: none; }
  .gbtn svg { background: #fff; border-radius: 50%; padding: 4px; box-sizing: content-box; }
  .gbtn:hover { opacity: .92; color: var(--bg); }
  .gbtn:focus-visible { outline: 3px solid #2563EB; outline-offset: 3px; }
  .note { color: var(--ink-2); font-size: 14px; margin: 14px 0 0; text-align: center; }
  .note a { color: var(--ink); font-weight: 700; }
  .note.small { font-size: 13px; margin-top: 22px; }
  .note.small a { font-weight: 600; color: var(--ink-2); }
  .note.end { margin-top: 30px; font-size: 15px; line-height: 1.5; }
  .err { background: #FBE9E7; color: #8C1D18; padding: 12px 14px; border-radius: 12px; margin: 0 0 14px; font-weight: 600; }
</style>
