<script>
  import Logo from '$lib/components/Logo.svelte';
  import Welcome from '$lib/components/Welcome.svelte';
  let { data, form } = $props();
  let first = $derived((data.invite?.name || '').split(' ')[0]);
</script>

<svelte:head><title>You're invited · You Should Try</title></svelte:head>

<div class="wrapi">
  <Logo size={40} tone={data.look === 'dark' ? 'light' : 'ink'} />
  {#if data.invite}
    <p class="from">{data.invite.from} invited you{first ? `, ${first}` : ''}</p>
    <h1>Keep track of what friends say you should try.</h1>
    {#if data.invite.knows}<p class="knows">“{data.invite.knows}”</p>{/if}
    <p class="lead">When someone says "you have to watch this" or "read this," it goes on one shared board. Later, when you're looking for something, it's all there with who said it.</p>
    {#if form?.message}<p class="err" role="alert">{form.message}</p>{/if}
    {#if data.googleReady}
      <form method="POST" action="?/google"><button class="btn dark big join"><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Join with Google</button></form>
      {#if data.invite.email}<p class="acct">This invite went to <b>{data.invite.email}</b>. Pick that Google account if you have it, and use the same one every time you sign in.</p>{/if}
      <p class="small">Just signs you in. Nothing gets posted anywhere.</p>
    {/if}
    <a class="seehow" href="#how-h">New to this? See how it works</a>
    <details class="alt">
      <summary>Not a Google person?</summary>
      <form method="POST" action="?/guest" class="guest">
        <label for="nm">Your name</label>
        <input id="nm" name="name" value={data.invite.name ?? ''} maxlength="60" autocomplete="name" required />
        <button class="btn">Start without an account</button>
        <p class="small">Works on this device only. You can sign in with Google later.</p>
      </form>
    </details>
    <Welcome />
    {#if data.googleReady}
      <div class="again">
        <p><b>Ready?</b> It takes about ten seconds.</p>
        <form method="POST" action="?/google"><button class="btn dark big join">Join with Google</button></form>
        {#if data.invite.email}<p class="small">Use the Google account for {data.invite.email} if you have one.</p>{/if}
      </div>
    {/if}
  {:else}
    <h1>This invite has run out</h1>
    <p class="lead">Invite links work once and last two weeks. Ask your friend to send a new one.</p>
    <a class="btn dark big" href="/signin">Already a member? Sign in</a>
  {/if}
</div>

<style>
  .seehow { margin-top: 6px; font-weight: 700; color: var(--ink); }
  .again { margin: 30px 0 10px; padding: 18px; border-radius: 18px; background: var(--surface); display: grid; gap: 10px; }
  .again p { margin: 0; }
  .acct { margin: 2px 0 0; padding: 10px 12px; border-radius: 12px; background: var(--surface); font-size: 14.5px; }
  .wrapi { max-width: 520px; margin: 28px auto 40px; display: flex; flex-direction: column; gap: 10px; }
  .from { margin: 18px 0 0; font-weight: 800; color: var(--ink-2); }
  h1 { margin: 0; font-size: 30px; line-height: 1.1; font-weight: 800; letter-spacing: -.025em; }
  .knows { margin: 4px 0 0; font-family: "Instrument Serif", Georgia, serif; font-style: italic; font-size: 22px; }
  .lead { margin: 4px 0 10px; color: var(--ink-2); line-height: 1.5; }
  .big { min-height: 52px; width: 100%; font-size: 17px; }
  .join { display: flex; align-items: center; justify-content: center; gap: 10px; border-radius: 999px; }
  .join svg { background: #fff; border-radius: 50%; padding: 4px; box-sizing: content-box; }
  .small { color: var(--ink-2); font-size: 13.5px; margin: 0; }
  .alt { margin-top: 14px; background: var(--surface); border-radius: 14px; padding: 12px 14px; }
  .alt summary { font-weight: 700; cursor: pointer; }
  .guest { display: grid; gap: 8px; margin-top: 10px; }
  .guest label { font-weight: 800; font-size: 14px; }
  .guest input { min-height: 46px; border-radius: 12px; border: 1px solid var(--line); padding: 0 12px; font: 16px Manrope, sans-serif; }
  .err { color: #B42318; font-weight: 700; }
</style>
