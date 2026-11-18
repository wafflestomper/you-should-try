<script>
  import Logo from '$lib/components/Logo.svelte';
  let { data, form } = $props();
  let first = $derived((data.invite?.name || '').split(' ')[0]);
</script>

<svelte:head><title>You're invited · You Should Try</title></svelte:head>

<div class="wrapi">
  <Logo size={40} />
  {#if data.invite}
    <p class="from">{data.invite.from} invited you{first ? `, ${first}` : ''}</p>
    <h1>Keep track of what friends say you should try.</h1>
    {#if data.invite.knows}<p class="knows">“{data.invite.knows}”</p>{/if}
    <p class="lead">When someone says "you have to watch this" or "read this," it goes on one shared board. Later, when you're looking for something, it's all there with who said it.</p>
    {#if form?.message}<p class="err" role="alert">{form.message}</p>{/if}
    {#if data.googleReady}
      <form method="POST" action="?/google"><button class="btn dark big">Join with Google</button></form>
      <p class="small">Just signs you in. Nothing gets posted anywhere.</p>
    {/if}
    <details class="alt">
      <summary>Not a Google person?</summary>
      <form method="POST" action="?/guest" class="guest">
        <label for="nm">Your name</label>
        <input id="nm" name="name" value={data.invite.name ?? ''} maxlength="60" autocomplete="name" required />
        <button class="btn">Start without an account</button>
        <p class="small">Works on this device only. You can sign in with Google later.</p>
      </form>
    </details>
  {:else}
    <h1>This invite has run out</h1>
    <p class="lead">Invite links work once and last two weeks. Ask your friend to send a new one.</p>
    <a class="btn dark big" href="/signin">Already a member? Sign in</a>
  {/if}
</div>

<style>
  .wrapi { max-width: 460px; margin: 28px auto 0; display: flex; flex-direction: column; gap: 10px; }
  .from { margin: 18px 0 0; font-weight: 800; color: var(--ink-2); }
  h1 { margin: 0; font-size: 30px; line-height: 1.1; font-weight: 800; letter-spacing: -.025em; }
  .knows { margin: 4px 0 0; font-family: "Instrument Serif", Georgia, serif; font-style: italic; font-size: 22px; }
  .lead { margin: 4px 0 10px; color: var(--ink-2); line-height: 1.5; }
  .big { min-height: 52px; width: 100%; font-size: 17px; }
  .small { color: var(--ink-2); font-size: 13.5px; margin: 0; }
  .alt { margin-top: 14px; background: var(--surface); border-radius: 14px; padding: 12px 14px; }
  .alt summary { font-weight: 700; cursor: pointer; }
  .guest { display: grid; gap: 8px; margin-top: 10px; }
  .guest label { font-weight: 800; font-size: 14px; }
  .guest input { min-height: 46px; border-radius: 12px; border: 1px solid var(--line); padding: 0 12px; font: 16px Manrope, sans-serif; }
  .err { color: #B42318; font-weight: 700; }
</style>
