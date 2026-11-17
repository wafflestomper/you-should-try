<script>
  import Corners from '$lib/components/Corners.svelte';
  import Ribbon from '$lib/components/Ribbon.svelte';
  let { data } = $props();
</script>

<svelte:head><title>Sign in · You Should Try</title></svelte:head>

<div class="frame" style="max-width:640px;margin:40px auto 0"><div class="board box"><Corners size={70} />
  <div class="inner">
    <div class="script you">You should</div><Ribbon w={260} h={60} size={30} />
    <p class="script" style="font-size:24px;margin:18px 0 0">what your friends can't stop talking about</p>
    {#if data.error}<p class="err" role="alert">{data.error}</p>{/if}
    {#if data.googleReady}
      <a class="gbtn" href="/auth/google">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        {data.guest ? 'Keep your lists: sign in with Google' : 'Sign in with Google'}
      </a>
    {:else}
      <p class="note">Google sign-in isn't switched on yet.</p>
    {/if}
    <p class="note">You Should Try is invite only. New here? Open the invite link a friend sent you.</p>
    {#if data.dev}
      <p class="note">Local testing: <a href="/auth/dev?user=u-z">sign in as Z</a> · <a href="/auth/dev?user=u-sarah">as Sarah</a></p>
    {/if}
  </div>
</div></div>

<style>
  .box { padding: 34px 30px 30px; text-align: center; }
  .inner { position: relative; display: flex; flex-direction: column; align-items: center; }
  .you { font-size: 60px; line-height: .9; transform: rotate(-5deg); }
  .gbtn { margin-top: 26px; display: inline-flex; align-items: center; gap: 10px; background: #fff; color: #1f1f1f; border-radius: 24px; padding: 12px 22px; font-weight: 700; text-decoration: none; min-height: 48px; }
  .gbtn:hover { color: #1f1f1f; background: #F2F2F0; }
  .note { color: var(--chalk-2); font-size: 14px; margin: 16px 0 0; max-width: 420px; }
  .err { background: #FBE9E7; color: #8C1D18; padding: 10px 14px; border-radius: 8px; margin-top: 18px; font-weight: 600; }
</style>
