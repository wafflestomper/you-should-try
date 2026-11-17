<script>
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
<h1 class="slab" style="font-size:48px;margin:32px 0 0">Admin</h1>
<p class="muted" style="margin:6px 0 0">New people get full access right away. Check them here and keep or revoke.</p>
{#if form?.message}<p class="err" role="alert">{form.message}</p>{/if}

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
  .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px 0; border-bottom: 1px solid var(--line); }
  .pill { font-size: 12px; font-weight: 700; border: 1px solid #CFCDC4; border-radius: 10px; padding: 1px 8px; }
  .danger { color: #B42318; border-color: #E3B3AE; }
  .err { color: #B42318; font-weight: 600; }
  code { word-break: break-all; color: var(--ink-2); }
</style>
