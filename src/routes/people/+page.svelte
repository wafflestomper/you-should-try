<script>
  import { page } from '$app/state';
  import ShowMe from '$lib/components/ShowMe.svelte';
  import { enhance } from '$app/forms';
  import { inviteBody, inviteSubject, inviteText } from '$lib/inviteText.js';
  let { data, form } = $props();

  let name = $state(form?.name ?? data.req?.name ?? data.prefill?.name ?? '');
  let email = $state(form?.email ?? data.req?.email ?? data.prefill?.email ?? '');
  let guest = $state(form?.guest ?? data.prefill?.id ?? '');
  // Arriving from "Invite Warren": go straight to the email box
  $effect(() => { if (data.prefill && !form) document.getElementById('inv-email')?.focus(); });
  let formEl;

  let link = $derived(form?.code ? `${data.origin}/invite/${form.code}` : null);
  let first = $derived((form?.name || '').split(' ')[0]);
  let subject = $derived(inviteSubject(data.myName));
  let body = $derived(link ? inviteBody({ toName: form?.name, fromName: data.myName, picks: form?.picks, link, email: form?.email, maker: data.maker }) : '');
  let sendTo = $state(form?.email ?? '');
  $effect(() => { if (form?.code) sendTo = form.sent || form.email || ''; });
  let sending = $state(false);
  let mailto = $derived(`mailto:${encodeURIComponent(form?.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  let sms = $derived(`sms:?&body=${encodeURIComponent(inviteText({ toName: form?.name, fromName: data.myName, link, email: form?.email, maker: data.maker }))}`);
  let copied = $state(false);
  let canShare = $state(false);
  $effect(() => { canShare = !!navigator.share; });
  async function copy() { try { await navigator.clipboard.writeText(link); copied = true; setTimeout(() => (copied = false), 2000); } catch {} }
  // The share sheet usually goes to Messages, so share the short personal text (it has the link in it)
  async function share() { try { await navigator.share({ text: inviteText({ toName: form?.name, fromName: data.myName, link, email: form?.email, maker: data.maker }) }); } catch {} }
  function inviteGuest(g) { name = g.name; guest = g.id; email = ''; document.getElementById('inv-email')?.focus(); document.getElementById('invite')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  const asDate = (t) => new Date(String(t).replace(' ', 'T') + (String(t).length > 10 ? 'Z' : 'T12:00:00Z'));
  const joined = (t) => { if (!t) return ''; const d = asDate(t), now = new Date(); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) }); };
  const joinedRecently = (t) => t && Date.now() - asDate(t).getTime() < 7 * 864e5;
</script>

<svelte:head><title>People · You Should Try</title></svelte:head>
<h1>People</h1>
<a class="whohere" href="#members"><b>{data.people.length + 1} people</b> are on here, counting you. <span>See who joined</span></a>

<section class="box" id="invite">
  <h2>Invite someone</h2>
  <ShowMe topic="invite" />
  {#if link}
    <p class="sub">Invite for <b>{form.name}</b> is ready. It works once and lasts two weeks.{#if form.picks}{' '}Their {form.picks} picks move to their account when they join.{/if}</p>
    {#if form.email}<p class="acct">Tell {first} to sign in with Google as <b>{form.email}</b>. The message below already says so.</p>{:else}<p class="acct">No email on this invite. Tell {first} which Google account to use, and to stick with it.</p>{/if}
    {#if data.canSend}
      {#if form?.sent}
        <p class="ok" role="status">Sent to <b>{form.sent}</b>. If they reply, it comes to your email.</p>
      {:else}
        <form method="POST" action="?/send" class="sendf" use:enhance={() => { sending = true; return async ({ update }) => { await update({ reset: false }); sending = false; }; }}>
          <input type="hidden" name="code" value={form.code} />
          <label for="send-to">Send it from the site</label>
          <div class="sendline">
            <input id="send-to" name="to" type="email" bind:value={sendTo} placeholder="their@email.com" maxlength="120" autocomplete="off" required />
            <button class="btn dark" disabled={sending}>{sending ? 'Sending…' : 'Send email'}</button>
          </div>
          {#if form?.sendError}<p class="err" role="alert">{form.sendError}</p>{/if}
        </form>
        <p class="hint or">Or send it yourself:</p>
      {/if}
    {/if}
    <div class="sendrow">
      <a class="btn {data.canSend ? '' : 'dark'}" href={mailto}>{data.canSend ? 'From my email' : 'Email it'}</a>
      <a class="btn" href={sms}>Text it</a>
      {#if canShare}<button class="btn" onclick={share}>Share…</button>{/if}
      <button class="btn" onclick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
    </div>
    <details class="preview"><summary>See the email</summary><pre>{body}</pre></details>
    <a class="again" href="/people">Invite someone else</a>
  {:else}
    <form method="POST" action="?/invite" use:enhance={() => async ({ update }) => update({ reset: false })} bind:this={formEl} class="f">
      <input type="hidden" name="guest" value={guest} />
      {#if data.req}<input type="hidden" name="req" value={data.req.id} /><input type="hidden" name="knows" value={data.req.knows} /><p class="hint">From {data.req.name}'s request: “{data.req.knows}”</p>{/if}
      <label for="inv-name">Their name</label>
      <input id="inv-name" name="name" bind:value={name} maxlength="60" required autocomplete="off" oninput={() => (guest = '')} />
      {#if guest}<p class="hint">Their picks already on the board will move to their account when they join.</p>{/if}
      <label for="inv-email">Their email <span class="opt">(optional)</span></label>
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

<section id="members">
  <h2>Who's on here</h2>
  <p class="hint">Newest first.</p>
  {#if data.people.length}
    <ul class="ppl">
      {#each data.people as p (p.id)}
        <li><div><a class="pl" href="/people/{p.id}"><b>{p.name}</b></a>{#if joinedRecently(p.joined_at)}<span class="nw">New</span>{/if}<div class="hint">{[`Joined ${joined(p.joined_at)}${p.inviter ? `, invited by ${p.inviter}` : ''}`, p.how_known, `${p.picks} pick${p.picks === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</div></div>
          <span class="m">{p.match != null ? `${p.match}% match` : ''}{#if page.data.realUser?.is_admin}<a class="ed" href="/admin?person={p.id}#people">Edit</a>{/if}</span></li>
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
  .sendf { display: grid; gap: 6px; margin-bottom: 4px; }
  .sendline { display: flex; gap: 8px; flex-wrap: wrap; }
  .sendline input { flex: 1 1 170px; min-width: 0; }
  .sendline .btn { min-height: 46px; padding: 0 18px; white-space: nowrap; }
  .ok { background: var(--surface-2); border-radius: 12px; padding: 12px 14px; margin: 0 0 12px; }
  .or { margin: 12px 0 8px; }
  .sendrow { display: flex; gap: 8px; flex-wrap: wrap; }
  .sendrow .btn { min-height: 46px; padding: 0 18px; text-decoration: none; }
  .preview { margin-top: 12px; }
  .preview summary { cursor: pointer; font-weight: 700; color: var(--ink-2); }
  pre { white-space: pre-wrap; font: 14px/1.5 Manrope, sans-serif; background: var(--surface-2); border-radius: 12px; padding: 12px; }
  .again { display: inline-block; margin-top: 12px; font-weight: 700; color: var(--ink); }
  .whohere { display: block; background: var(--surface); border-radius: 14px; padding: 12px 14px; margin: 0 0 14px; color: var(--ink); text-decoration: none; }
  .whohere span { display: inline-block; margin-left: 6px; color: var(--ink-2); font-weight: 700; text-decoration: underline; }
  #members { scroll-margin-top: 80px; }
  .nw { margin-left: 8px; padding: 1px 8px; border-radius: 999px; background: #E11D48; color: #fff; font: 800 11px Manrope, sans-serif; vertical-align: 2px; }
  .ed { display: block; margin-top: 4px; font-size: 13px; font-weight: 700; color: var(--ink-2); text-align: right; }
  .acct { margin: 0 0 10px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); font-size: 14.5px; }
  .ppl { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .ppl li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: var(--surface); border-radius: 14px; }
  .pl { color: var(--ink); text-decoration: none; }
  .full { margin-left: 8px; color: var(--ink-3); font-size: 14px; font-weight: 600; }
  .m { font-weight: 800; color: var(--ink-2); font-size: 14px; white-space: nowrap; }
</style>
