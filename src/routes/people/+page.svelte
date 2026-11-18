<script>
  import { enhance } from '$app/forms';
  let { data, form } = $props();

  let name = $state(form?.name ?? '');
  let knows = $state(form?.knows ?? '');
  let email = $state(form?.email ?? '');
  let guest = $state(form?.guest ?? '');
  let formEl;

  let link = $derived(form?.code ? `${data.origin}/invite/${form.code}` : null);
  let first = $derived((form?.name || '').split(' ')[0]);
  let subject = $derived(`${data.myName.split(' ')[0]} says you should try this`);
  let body = $derived(link ? [
    `Hi ${first},`, '',
    `I'm using a little site where friends keep track of the shows, books and places we tell each other about, so nobody forgets "what was that thing you said?"`,
    form?.picks ? `${form.picks} of your recommendations are already on it.` : '',
    '', `Here's your invite (it works once and lasts two weeks):`, link, '',
    `It's free and private, just our group. Sign in with Google.`, '', `- ${data.myName}`
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n') : '');
  let mailto = $derived(`mailto:${encodeURIComponent(form?.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  let sms = $derived(`sms:?&body=${encodeURIComponent(`${first}, you should try this: our group's recommendation board. Your invite: ${link}`)}`);
  let copied = $state(false);
  let canShare = $state(false);
  $effect(() => { canShare = !!navigator.share; });
  async function copy() { try { await navigator.clipboard.writeText(link); copied = true; setTimeout(() => (copied = false), 2000); } catch {} }
  async function share() { try { await navigator.share({ title: subject, text: body.replace(link, '').trim(), url: link }); } catch {} }
  function inviteGuest(g) { name = g.name; guest = g.id; knows = ''; email = ''; document.getElementById('inv-knows')?.focus(); document.getElementById('invite')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
</script>

<svelte:head><title>People · You Should Try</title></svelte:head>
<h1>People</h1>

<section class="box" id="invite">
  <h2>Invite someone</h2>
  {#if link}
    <p class="sub">Invite for <b>{form.name}</b> is ready. It works once and lasts two weeks.{#if form.picks} Their {form.picks} picks move to their account when they join.{/if}</p>
    <div class="sendrow">
      <a class="btn dark" href={mailto}>Email it</a>
      <a class="btn" href={sms}>Text it</a>
      {#if canShare}<button class="btn" onclick={share}>Share…</button>{/if}
      <button class="btn" onclick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
    </div>
    <details class="preview"><summary>See the email</summary><pre>{body}</pre></details>
    <a class="again" href="/people">Invite someone else</a>
  {:else}
    <form method="POST" action="?/invite" use:enhance={() => async ({ update }) => update({ reset: false })} bind:this={formEl} class="f">
      <input type="hidden" name="guest" value={guest} />
      <label for="inv-name">Their name</label>
      <input id="inv-name" name="name" bind:value={name} maxlength="60" required autocomplete="off" oninput={() => (guest = '')} />
      {#if guest}<p class="hint">Their picks already on the board will move to their account when they join.</p>{/if}
      <label for="inv-knows">How do you know them?</label>
      <input id="inv-knows" name="knows" bind:value={knows} maxlength="140" placeholder="Teaches 7th grade with me" required />
      <label for="inv-email">Their email <span class="opt">(so the email is addressed for you)</span></label>
      <input id="inv-email" name="email" type="email" bind:value={email} maxlength="120" autocomplete="off" />
      {#if form?.message}<p class="err" role="alert">{form.message}</p>{/if}
      <button class="btn dark">Make the invite</button>
    </form>
  {/if}
</section>

{#if data.guests.length}
  <section>
    <h2>Have picks, not on here yet</h2>
    <ul class="ppl">
      {#each data.guests as g (g.id)}
        <li><div><b>{g.name}</b><div class="hint">{g.picks} pick{g.picks === 1 ? '' : 's'} on the board{g.invited_at ? ' · invited' : ''}</div></div>
          <button class="btn sm" onclick={() => inviteGuest(g)}>{g.invited_at ? 'Invite again' : 'Invite'}</button></li>
      {/each}
    </ul>
  </section>
{/if}

<section>
  <h2>On the board</h2>
  {#if data.people.length}
    <ul class="ppl">
      {#each data.people as p (p.id)}
        <li><div><b>{p.short}</b>{#if p.short !== p.name}<span class="hint"> {p.name}</span>{/if}<div class="hint">{[p.how_known, `${p.picks} pick${p.picks === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</div></div>
          <span class="m">{p.match != null ? `${p.match}% match` : ''}</span></li>
      {/each}
    </ul>
  {:else}<p class="hint">Nobody else yet. Invite someone above.</p>{/if}
</section>

<style>
  h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 14px 0 12px; }
  h2 { font-size: 18px; font-weight: 800; margin: 22px 0 8px; }
  .box { background: var(--surface); border-radius: 18px; padding: 4px 16px 16px; }
  .sub { margin: 0 0 12px; }
  .f { display: grid; gap: 6px; }
  label { font-weight: 800; font-size: 14.5px; margin-top: 8px; }
  input { min-height: 46px; border-radius: 12px; border: 1px solid var(--line); padding: 0 12px; font: 16px Manrope, sans-serif; }
  .opt { font-weight: 600; color: var(--ink-3); }
  .f .btn { min-height: 48px; margin-top: 12px; }
  .hint { color: var(--ink-2); font-size: 13.5px; margin: 0; }
  .err { color: #B42318; font-weight: 700; margin: 4px 0 0; }
  .sendrow { display: flex; gap: 8px; flex-wrap: wrap; }
  .sendrow .btn { min-height: 46px; padding: 0 18px; text-decoration: none; }
  .preview { margin-top: 12px; }
  .preview summary { cursor: pointer; font-weight: 700; color: var(--ink-2); }
  pre { white-space: pre-wrap; font: 14px/1.5 Manrope, sans-serif; background: var(--surface-2); border-radius: 12px; padding: 12px; }
  .again { display: inline-block; margin-top: 12px; font-weight: 700; color: var(--ink); }
  .ppl { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .ppl li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: var(--surface); border-radius: 14px; }
  .m { font-weight: 800; color: var(--ink-2); font-size: 14px; white-space: nowrap; }
</style>
