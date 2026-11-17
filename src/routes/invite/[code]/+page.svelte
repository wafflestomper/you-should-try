<script>
  import Corners from '$lib/components/Corners.svelte';
  import Ribbon from '$lib/components/Ribbon.svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>You're invited · You Should Try</title></svelte:head>

<div class="frame" style="max-width:680px;margin:40px auto 0"><div class="board box"><Corners size={70} />
  <div class="inner">
    {#if data.invite}
      <div class="cap" style="font-size:12.5px;color:var(--chalk-2)">{data.invite.from} invited you</div>
      <div class="script you" style="margin-top:12px">You should</div><Ribbon w={260} h={60} size={30} />
      {#if data.invite.knows}<p class="script q">“{data.invite.knows}”</p>{/if}
      <p class="lead">Friends rank their top 10 books, shows, movies, restaurants, and recipes, then tell each other what to try.{#if data.invite.circle}{' '}You'll join the <b>{data.invite.circle}</b> circle.{/if}</p>
      {#if form?.message}<p class="err" role="alert">{form.message}</p>{/if}
      <form method="POST" action="?/guest" class="guest">
        <label for="nm">Your name</label>
        <input id="nm" name="name" value={data.invite.name ?? ''} maxlength="60" autocomplete="name" required />
        <button class="btn" style="background:var(--chalk);color:var(--slate);border-color:var(--chalk)">Jump in, no account needed</button>
      </form>
      {#if data.googleReady}
        <form method="POST" action="?/google"><button class="btn chalk">Or sign in with Google now</button></form>
      {/if}
      <p class="note">Starting without an account works on this device. Sign in with Google later to keep your lists everywhere.</p>
    {:else}
      <div class="slab" style="font-size:38px">This invite has run out</div>
      <p class="lead">Invite links work once and last a week. Ask your friend to send you a new one.</p>
      <a class="btn chalk" href="/signin">Already a member? Sign in</a>
    {/if}
  </div>
</div></div>

<style>
  .box { padding: 34px 30px 30px; text-align: center; }
  .inner { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .you { font-size: 60px; line-height: .9; transform: rotate(-5deg); }
  .q { font-size: 28px; margin: 14px 0 0; }
  .lead { max-width: 460px; color: var(--chalk-2); margin: 12px 0 18px; }
  .guest { display: grid; gap: 8px; width: 100%; max-width: 340px; text-align: left; margin-bottom: 10px; }
  .guest label { font: 600 13px var(--caps); letter-spacing: .14em; text-transform: uppercase; color: var(--chalk-2); }
  .guest input { min-height: 46px; border-radius: 8px; border: 2px solid rgba(241,240,234,.5); background: transparent; color: var(--chalk); padding: 0 12px; font: 17px var(--body); }
  .note { color: var(--chalk-2); font-size: 13.5px; margin: 14px 0 0; max-width: 420px; }
  .err { background: #FBE9E7; color: #8C1D18; padding: 10px 14px; border-radius: 8px; font-weight: 600; }
</style>
