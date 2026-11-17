<script>
  import { enhance } from '$app/forms';
  let { data } = $props();
  const first = (n) => (n || '').split(' ')[0];
</script>
<svelte:head><title>Notifications · You Should Try</title></svelte:head>
<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-top:32px">
  <h1 style="margin:0;font-weight:400"><span class="script" style="font-size:40px">your</span> <span class="blk" style="font-size:40px">NOTES</span></h1>
  <form method="POST" action="?/read" use:enhance><button class="btn sm">Mark all read</button></form>
</div>
<div class="rule" style="margin-top:14px"></div>
{#each data.notes as n}
  <div class="n" class:new={!n.read_at}>
    {#if n.type === 'saved_your_pick'}<b>{first(n.actor_name)}</b> saved <a href="/item/{n.item_id}">{n.item_title}</a> from your {n.list_title}.
    {:else if n.type === 'tried_your_pick'}<b>{first(n.actor_name)}</b> tried your pick <a href="/item/{n.item_id}">{n.item_title}</a> and ranked it No. {n.data.rank}.
    {:else if n.type === 'sent_you'}<b>{first(n.actor_name)}</b> says you should try <a href="/item/{n.item_id}">{n.item_title}</a>.
    {:else if n.type === 'new_list'}<b>{first(n.actor_name)}</b> started a new list, <a href="/list/{n.list_id}">{n.list_title}</a>.{/if}
  </div>
{:else}<p class="muted">No notifications yet.</p>{/each}
<style>.n { padding: 14px 12px; border-bottom: 1px solid var(--line); } .n.new { background: #FBF8EC; }</style>
