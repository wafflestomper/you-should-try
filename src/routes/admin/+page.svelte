<script>
  import Libraries from '$lib/components/Libraries.svelte';
  import { enhance } from '$app/forms';
  import Avatar from '$lib/components/Avatar.svelte';
  let { data, form } = $props();
  let confirmDemo = $state(false);
  let copied = $state(null);
  async function copy(code) {
    try { await navigator.clipboard.writeText(`${data.origin}/invite/${code}`); copied = code; setTimeout(() => (copied = null), 2000); } catch { /* the link is shown, so it can be copied by hand */ }
  }
</script>

<svelte:head><title>Admin · You Should Try</title></svelte:head>
<h1 class="slab" style="font-size:32px;margin:20px 0 0">Admin</h1>
<section class="deflibs">
  <h2 class="h2">Libraries for everyone</h2>
  <p class="small muted">Everyone checks these until they pick their own. Search by name, or paste a Libby link like libbyapp.com/library/henrico.</p>
  <Libraries libs={data.defaultLibs} label="Group libraries" admin />
</section>

<section class="dups" id="duplicates">
  <h2 class="h2">Possible duplicates {#if data.dups.length}<span class="cnt">{data.dups.length}</span>{/if}</h2>
  {#if !data.dups.length}<p class="muted small">Nothing looks doubled up right now.</p>{/if}
  {#each data.dups as d (d.a.id + d.b.id)}
    <div class="pair">
      {#each [[d.a, d.b], [d.b, d.a]] as [keep, drop]}
        <div class="side">
          <a href="/item/{keep.id}"><b>{keep.title}</b></a>
          <div class="small muted">{keep.kind}{keep.creator ? `, ${keep.creator}` : ''} · {keep.recs} recommendation{keep.recs === 1 ? '' : 's'}</div>
          <form method="POST" action="?/merge"><input type="hidden" name="from" value={drop.id} /><input type="hidden" name="to" value={keep.id} /><button class="btn sm">Keep this one</button></form>
        </div>
      {/each}
      <form method="POST" action="?/notDup" class="nd"><input type="hidden" name="a" value={d.a.id} /><input type="hidden" name="b" value={d.b.id} /><button class="lnkb">Not the same</button><span class="small muted">{d.score}% alike</span></form>
    </div>
  {/each}
</section>

<form method="POST" action="?/matchMin" class="mm">
  <label for="mm">Taste match kicks in after</label>
  <input id="mm" name="n" type="number" min="1" max="50" value={data.matchMin} />
  <span>shared reactions</span>
  <button class="btn sm">Save</button>
</form>
<p class="muted" style="margin:6px 0 0">New people get full access right away. Check them here and keep or revoke.</p>
{#if form?.message}<p class="err" role="alert">{form.message}</p>{/if}

<section id="requests">
<h2 class="h2" style="margin-top:28px">Invite requests {#if data.requests.length}<span class="cnt">{data.requests.length}</span>{/if}</h2><div class="rule"></div>
{#each data.requests as r (r.id)}
  <div class="row">
    <div style="flex:1;min-width:220px"><b>{r.name}</b> <span class="small muted">{r.email}</span>
      <div class="small">Knows: “{r.knows}”</div>
      {#if r.note}<div class="small muted">{r.note}</div>{/if}
      <div class="small muted">Asked {r.created_at.slice(5, 10).replace('-', '/')}</div></div>
    <div class="reqbtns">
      <a class="btn sm dark" href="/people?req={r.id}">Invite</a>
      <form method="POST" action="?/dismissRequest" use:enhance><input type="hidden" name="id" value={r.id} /><button class="btn sm">Dismiss</button></form>
    </div>
  </div>
{:else}<p class="muted">No requests right now.</p>{/each}
</section>

<h2 class="h2" style="margin-top:34px">New members</h2><div class="rule"></div>
{#each data.newbies as u}
  <div class="row">
    <Avatar name={u.name} color={u.color} />
    <div style="flex:1;min-width:220px"><b>{u.name}</b>{#if u.is_guest} <span class="pill">guest</span>{/if}
      <div class="small muted">Invited by {u.invited_by_name ?? 'nobody'}{u.knows_note ? `: “${u.knows_note}”` : ''}{u.circles ? ` · ${u.circles}` : ''} · joined {u.joined_at.slice(5, 10).replace('-', '/')}</div></div>
    <form method="POST" action="?/keep" use:enhance><input type="hidden" name="id" value={u.id} /><button class="btn sm">Keep</button></form>
    <form method="POST" action="?/revoke" use:enhance><input type="hidden" name="id" value={u.id} /><button class="btn sm danger">Revoke</button></form>
  </div>
{:else}<p class="muted">No one new to review.</p>{/each}

<h2 class="h2" style="margin-top:34px">Open invite links</h2><div class="rule"></div>
{#each data.invites as v}
  <div class="row">
    <div style="flex:1;min-width:220px"><b>{v.name || 'Unnamed'}</b><div class="small muted">From {v.from_name} · expires {v.expires_at.slice(5, 10).replace('-', '/')}</div>
      <code class="small">{data.origin}/invite/{v.code}</code></div>
    <button class="btn sm" type="button" onclick={() => copy(v.code)}>{copied === v.code ? 'Copied' : 'Copy link'}</button>
    <form method="POST" action="?/cancelInvite" use:enhance><input type="hidden" name="code" value={v.code} /><button class="btn sm">Cancel</button></form>
  </div>
{:else}<p class="muted">No open invites. Make one from the People page.</p>{/each}

<h2 class="h2" style="margin-top:34px">Circle suggestions</h2><div class="rule"></div>
{#each data.circles as c}
  <div class="row">
    <div style="flex:1;min-width:220px"><b>{c.name}</b><div class="small muted">Suggested by {c.by_name ?? 'someone'}{c.note ? `: “${c.note}”` : ''}</div></div>
    <form method="POST" action="?/approveCircle" use:enhance><input type="hidden" name="id" value={c.id} /><button class="btn sm dark">Approve</button></form>
    <form method="POST" action="?/declineCircle" use:enhance><input type="hidden" name="id" value={c.id} /><button class="btn sm">Decline</button></form>
  </div>
{:else}<p class="muted">Nothing waiting.</p>{/each}

{#if data.demoCount}
  <h2 class="h2" style="margin-top:34px">Demo people</h2><div class="rule"></div>
  <p>There are {data.demoCount} demo people (Sarah, Tom, Dana, and the rest) with their lists. Remove them before inviting real friends. Your own lists stay.</p>
  {#if confirmDemo}
    <form method="POST" action="?/clearDemo" use:enhance={() => async ({ update }) => { await update(); confirmDemo = false; }} class="row" style="border:0">
      <span>Remove all {data.demoCount} demo people and their lists? This can't be undone.</span>
      <button class="btn sm dark">Remove demo people</button><button type="button" class="btn sm" onclick={() => (confirmDemo = false)}>Keep them</button>
    </form>
  {:else}<button type="button" class="btn sm" onclick={() => (confirmDemo = true)}>Remove demo people</button>{/if}
{/if}

<style>
  .deflibs { margin: 16px 0 24px; }
  #requests .row { flex-wrap: wrap; }
  .reqbtns { display: flex; gap: 8px; align-items: center; }
  .reqbtns .btn { text-decoration: none; min-height: 40px; display: inline-flex; align-items: center; padding: 0 16px; }
  .reqbtns form { margin: 0; }
  .dups { margin: 16px 0 24px; }
  .cnt { background: #C2410C; color: #fff; border-radius: 10px; font-size: 13px; padding: 1px 8px; vertical-align: middle; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #fff; border: 1px solid #E6E5E0; border-radius: 12px; padding: 12px; margin-top: 10px; }
  .side { display: grid; gap: 4px; align-content: start; }
  .side form { margin-top: 4px; }
  .nd { grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; border-top: 1px solid #EEE; padding-top: 8px; }
  .lnkb { background: none; border: 0; text-decoration: underline; cursor: pointer; font: inherit; color: var(--ink-2); padding: 4px 0; }
  .mm { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 12px 0 20px; }
  .mm input { width: 70px; min-height: 36px; font-size: 16px; padding: 0 8px; }
  .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px 0; border-bottom: 1px solid var(--line); }
  .pill { font-size: 12px; font-weight: 700; border: 1px solid #CFCDC4; border-radius: 10px; padding: 1px 8px; }
  .danger { color: #B42318; border-color: #E3B3AE; }
  .err { color: #B42318; font-weight: 600; }
  code { word-break: break-all; color: var(--ink-2); }
</style>
