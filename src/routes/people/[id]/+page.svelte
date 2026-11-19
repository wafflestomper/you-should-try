<script>
  import Cover from '$lib/components/Cover.svelte';
  import { KIND } from '$lib/kinds.js';
  let { data } = $props();
  let first = $derived(data.person.short.split(' ')[0]);
</script>

<svelte:head><title>{data.person.short} · You Should Try</title></svelte:head>

<a class="back" href="/people">People</a>
<h1>{data.person.name}</h1>
{#if data.person.how}<p class="muted how">{data.person.how}</p>{/if}

<section>
  <h2>Watching now</h2>
  {#if data.shows.length}
    <ul class="rows">
      {#each data.shows as x (x.id)}
        <li><a href="/item/{x.id}"><Cover title={x.title} kind="tv" image={x.image} w={40} />
          <span class="t">{x.title}</span>
          <span class="w">{x.finished ? 'Finished' : x.e === 0 ? 'Just started' : `S${x.s} E${x.e}`}{x.caughtUp ? ', caught up' : ''}</span></a></li>
      {/each}
    </ul>
  {:else}
    <p class="muted">{data.person.isMe ? (data.person.sharing ? "You're sharing, but not tracking any shows yet." : 'Your shows are private. Turn on sharing from the Watching tab.') : data.person.sharing ? `${first} isn't tracking any shows right now.` : `${first} keeps their shows private.`}</p>
  {/if}
</section>

<section>
  <h2>{data.person.isMe ? 'Your picks' : `${first}'s picks`}</h2>
  {#if data.picks.length}
    <ul class="rows">
      {#each data.picks as x (x.id)}
        <li><a href="/item/{x.id}"><Cover title={x.title} kind={x.kind} image={x.image_url} w={40} />
          <span class="t">{x.title}</span>
          <span class="w">{KIND[x.kind]?.label ?? x.kind}</span></a></li>
      {/each}
    </ul>
  {:else}<p class="muted">No picks on the board yet.</p>{/if}
</section>

<style>
  .back { display: inline-block; margin-top: 12px; color: var(--ink-2); font-weight: 700; text-decoration: none; }
  .back::before { content: '‹ '; }
  h1 { font-size: 28px; font-weight: 800; letter-spacing: -.02em; margin: 6px 0 2px; }
  .how { margin: 0; }
  h2 { font-size: 17px; font-weight: 800; margin: 24px 0 8px; }
  .rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .rows a { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding: 8px 12px; background: var(--surface); border-radius: 14px; color: var(--ink); text-decoration: none; }
  .t { font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w { font-size: 13.5px; color: var(--ink-2); white-space: nowrap; }
</style>
