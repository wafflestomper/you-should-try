<script>
  let { data } = $props();
  const first = (n) => (n || 'Someone').split(' ')[0];
  function ago(iso) {
    const d = (Date.now() - Date.parse(iso.replace(' ', 'T') + 'Z')) / 864e5;
    if (d < 1 / 24) return 'just now'; if (d < 1) return `${Math.floor(d * 24)}h ago`; if (d < 2) return 'yesterday';
    if (d < 30) return `${Math.floor(d)} days ago`; return `${Math.floor(d / 30)} mo ago`;
  }
</script>
<svelte:head><title>Notifications · You Should Try</title></svelte:head>

<h1>Notifications</h1>
{#if data.notes.length}
  <ul class="list">
    {#each data.notes as n (n.id)}
      <li class:new={n.isNew}>
        <span class="dot" aria-hidden="true"></span>
        <div class="txt">
          {#if n.type === 'loved_your_pick'}<b>{first(n.actor_name)}</b> {n.data.reaction === 'liked' ? 'liked' : 'loved'} <a href="/item/{n.item_id}">{n.item_title}</a>, which you recommended.
          {:else if n.type === 'joined_your_pick'}<b>{first(n.actor_name)}</b> recommends <a href="/item/{n.item_id}">{n.item_title}</a> too.
          {:else if n.type === 'possible_dup'}<b>Check for a duplicate:</b> {first(n.actor_name)} added <a href="/item/{n.item_id}">{n.item_title}</a>, which looks like “{n.data.other}”. <a href="/admin#duplicates">Review it</a>.
          {:else if n.type === 'saved_your_pick'}<b>{first(n.actor_name)}</b> saved <a href="/item/{n.item_id}">{n.item_title}</a>{n.list_title ? ` from your ${n.list_title}` : ''}.
          {:else if n.type === 'tried_your_pick'}<b>{first(n.actor_name)}</b> tried <a href="/item/{n.item_id}">{n.item_title}</a>{n.data.rank ? ` and put it at No. ${n.data.rank}` : ''}.
          {:else if n.type === 'sent_you'}<b>{first(n.actor_name)}</b> says you should try <a href="/item/{n.item_id}">{n.item_title}</a>.{#if n.rec_note} <i>“{n.rec_note}”</i>{/if}
          {:else if n.type === 'new_list'}<b>{first(n.actor_name)}</b> made a new list, {n.list_title}.
          {:else}<b>{first(n.actor_name)}</b> did something with <a href="/item/{n.item_id}">{n.item_title}</a>.{/if}
          <div class="when">{ago(n.created_at)}</div>
        </div>
      </li>
    {/each}
  </ul>
{:else}
  <p class="empty">Nothing yet. When someone loves something you recommended, or recommends it too, it shows up here.</p>
{/if}

<style>
  h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 14px 0 12px; }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li { display: flex; gap: 12px; align-items: flex-start; background: var(--surface); border-radius: 16px; padding: 14px; color: var(--ink); }
  .dot { flex: none; width: 9px; height: 9px; border-radius: 50%; margin-top: 7px; background: transparent; }
  li.new .dot { background: #E23A5F; }
  .txt { flex: 1; min-width: 0; line-height: 1.45; }
  .txt a { color: var(--ink); font-weight: 700; }
  .when { font-size: 12.5px; color: var(--ink-3); margin-top: 3px; }
  .empty { color: var(--ink-2); padding: 20px 0; }
</style>
