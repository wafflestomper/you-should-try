<script>
  import { enhance } from '$app/forms';
  import Avatar from '$lib/components/Avatar.svelte';
  let { data, form } = $props();
  let copied = $state(false);
  let link = $derived(form?.code ? `${data.origin}/invite/${form.code}` : null);
  async function copy() { try { await navigator.clipboard.writeText(link); copied = true; setTimeout(() => (copied = false), 2000); } catch { /* shown below to copy by hand */ } }
</script>

<svelte:head><title>People · You Should Try</title></svelte:head>
<h1 class="slab" style="font-size:48px;margin:32px 0 0">Your people</h1>

<div class="cols" style="margin-top:20px">
  <section class="main-col">
    <p class="muted" style="margin:0">Sorted by taste match. The network map comes in a later update.</p>
    <div class="rule" style="margin-top:14px"></div>
    {#each data.people as p}
      <a class="row" href="/people/{p.id}"><Avatar name={p.name} color={p.color} /><div style="flex:1"><b>{p.name}</b><div class="small muted">{p.circles ?? ''}</div></div>
        <span class={p.pct == null ? 'small faint' : 'slab'} style={p.pct == null ? '' : 'font-size:24px'}>{p.pct == null ? 'Not enough overlap yet' : `${p.pct}%`}</span></a>
    {:else}<p class="muted">No one else yet. Invite someone.</p>{/each}
  </section>

  <aside class="side-col">
    <div class="ticket">
      <h3>Invite someone</h3>
      {#if link}
        <p class="small" style="margin:12px 0 6px">Send this to {form.name}. It works once and lasts 7 days.</p>
        <input class="text" readonly value={link} aria-label="Invite link" onfocus={(e) => e.currentTarget.select()} />
        <div class="r"><button class="btn sm dark" type="button" onclick={copy}>{copied ? 'Copied' : 'Copy link'}</button><a class="btn sm" href="/people">Invite another</a></div>
      {:else}
        <form method="POST" action="?/invite" use:enhance class="f">
          <label>Their name<input class="text" name="name" maxlength="60" required /></label>
          <label>How do you know them?<input class="text" name="knows" maxlength="140" placeholder="We play doubles on Thursdays" required /></label>
          <label>Circle<select class="text" name="circle"><option value="">None for now</option>{#each data.circles as c}<option value={c.id}>{c.name}</option>{/each}</select></label>
          <label>Email (optional)<input class="text" name="email" type="email" maxlength="120" /></label>
          {#if form?.invite && form?.message}<p class="err" role="alert">{form.message}</p>{/if}
          <button class="btn dark">Make an invite link</button>
        </form>
      {/if}
    </div>

    <div class="ticket" style="margin-top:22px">
      <h3>Your circles</h3>
      <p class="small muted" style="margin:10px 0">Circles are how the site knows where you know people from.</p>
      {#each data.circles as c}
        <form method="POST" action="?/toggleCircle" use:enhance class="circ">
          <input type="hidden" name="id" value={c.id} /><input type="hidden" name="mine" value={c.mine ? '1' : '0'} />
          <span class="dot" style="background:{c.color}"></span><span style="flex:1">{c.name} <span class="faint small">{c.n}</span></span>
          <button class="btn sm" class:dark={c.mine} aria-pressed={!!c.mine}>{c.mine ? 'In it' : 'Join'}</button>
        </form>
      {/each}
      {#if form?.sent}<p class="small" role="status">Sent “{form.sent}” to the admins.</p>{/if}
      <form method="POST" action="?/suggestCircle" use:enhance class="f" style="margin-top:12px">
        <label>Suggest a new circle<input class="text" name="name" maxlength="40" placeholder="Book Club" /></label>
        <label>Who's in it? (optional)<input class="text" name="note" maxlength="140" /></label>
        {#if form?.circle && form?.message}<p class="err" role="alert">{form.message}</p>{/if}
        <button class="btn sm">Send to admins</button>
      </form>
    </div>
  </aside>
</div>

<style>
  .row { display: flex; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); color: var(--ink); text-decoration: none; }
  .f { display: grid; gap: 10px; margin-top: 12px; }
  .f label { display: grid; gap: 4px; font-weight: 600; font-size: 14px; }
  .text { width: 100%; min-height: 42px; border: 1.5px solid #CFCDC4; border-radius: 8px; padding: 0 10px; font: 15px var(--body); background: #fff; }
  .r { display: flex; gap: 8px; margin-top: 10px; }
  .circ { display: flex; gap: 10px; align-items: center; padding: 6px 0; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .err { color: #B42318; font-weight: 600; margin: 0; font-size: 14px; }
</style>
