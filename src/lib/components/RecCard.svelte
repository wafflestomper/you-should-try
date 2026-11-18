<script>
  import { enhance } from '$app/forms';
  import Cover from './Cover.svelte';
  let { card, action = '?/react' } = $props();
  const KIND = { book: 'Book', audiobook: 'Audiobook', movie: 'Movie', tv: 'TV show', podcast: 'Podcast', restaurant: 'Restaurant', recipe: 'Recipe', place: 'Place to go', other: 'Other' };
  const DONE = { book: 'Read it', audiobook: 'Listened', movie: 'Watched it', tv: 'Watched it', podcast: 'Listened', restaurant: 'Been there', recipe: 'Made it', place: 'Been there', other: 'Tried it' };
  const first = (n) => n.split(' ')[0];
  function ago(iso) {
    const d = (Date.now() - Date.parse(iso.replace(' ', 'T') + 'Z')) / 864e5;
    if (d < 1) return 'today'; if (d < 2) return 'yesterday'; if (d < 7) return `${Math.floor(d)} days ago`;
    if (d < 30) return `${Math.floor(d / 7)} wk ago`; return `${Math.floor(d / 30)} mo ago`;
  }
  let open = $state(false);
  let it = $derived(card.item);
  let mine = $derived(card.mine);
  let names = $derived([...new Set(card.recs.map((r) => first(r.by_name)))]);
</script>

<article class="rc card" class:starred={mine?.state === 'starred'}>
  <a href="/item/{it.id}" class="cov" tabindex="-1" aria-hidden="true"><Cover title={it.title} kind={it.kind} image={it.image_url} w={64} /></a>
  <div class="body">
    <div class="kind">{KIND[it.kind] ?? it.kind}{it.creator ? ` · ${it.creator}` : ''}</div>
    <h3><a href="/item/{it.id}">{it.title}</a></h3>
    <p class="who">
      <b>{names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(' and ')}</b> {names.length > 1 ? 'recommend' : 'recommended'} it · {ago(card.newest)}
      {#if card.boosted}<span class="match" title="People with taste like yours are behind this one">your kind of thing</span>{/if}
    </p>
    {#each card.recs.filter((r) => r.note) as r}<p class="note">“{r.note}” <span>– {first(r.by_name)}</span></p>{/each}
    {#if card.loved.length || card.liked.length}
      <p class="loves">{#if card.loved.length}❤️ {card.loved.map(first).join(', ')} loved it{/if}{#if card.loved.length && card.liked.length}{' · '}{/if}{#if card.liked.length}👍 {card.liked.map(first).join(', ')} liked it{/if}</p>
    {/if}

    <div class="acts">
      {#if mine?.state === 'done'}
        <span class="state">{mine.reaction === 'loved' ? '❤️ You loved it' : mine.reaction === 'liked' ? '👍 You liked it' : "You didn't like it"}</span>
        <form method="POST" {action} use:enhance><input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value="clear" /><button class="lnk">Undo</button></form>
      {:else if mine?.state === 'hidden'}
        <span class="state">Marked not for you</span>
        <form method="POST" {action} use:enhance><input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value="clear" /><button class="lnk">Put it back</button></form>
      {:else if open}
        <span class="q">How was it?</span>
        {#each [['loved', '❤️ Loved it'], ['liked', '👍 Liked it'], ['not_for_me', "Didn't like it"]] as [r, label]}
          <form method="POST" {action} use:enhance={() => async ({ update }) => { open = false; await update(); }}>
            <input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value="done" /><input type="hidden" name="reaction" value={r} />
            <button class="btn sm">{label}</button>
          </form>
        {/each}
        <button class="lnk" onclick={() => (open = false)}>Cancel</button>
      {:else}

        <button class="btn sm dark" onclick={() => (open = true)}>{DONE[it.kind] ?? 'Tried it'}</button>
        <form method="POST" {action} use:enhance>
          <input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value={mine?.state === 'starred' ? 'clear' : 'starred'} />
          <button class="btn sm star" aria-pressed={mine?.state === 'starred'} title={mine?.state === 'starred' ? 'Unstar' : 'Star it to keep it at the top of your board'}>{mine?.state === 'starred' ? '★ Starred' : '☆ Star'}</button>
        </form>
        <form method="POST" {action} use:enhance><input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value="hidden" /><button class="lnk" title="Takes it off your board. Everyone else still sees it.">Not for me</button></form>
      {/if}
    </div>
  </div>
</article>

<style>
  .rc { display: flex; gap: 14px; }
  .cov { flex: none; }
  .body { flex: 1; min-width: 0; }
  h3 { margin: 2px 0 4px; font-size: 18px; line-height: 1.25; }
  h3 a { color: var(--ink); text-decoration: none; }
  .who, .loves, .note { margin: 2px 0; font-size: 14.5px; color: var(--ink-2); }
  .who b { color: var(--ink); }
  .note { color: var(--ink); }
  .note span { color: var(--ink-3); }
  .match { margin-left: 6px; font-size: 12px; font-weight: 700; color: var(--accent); background: #E4F0EA; border-radius: 10px; padding: 1px 8px; white-space: nowrap; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 10px; }
  .acts form { margin: 0; }
  .starred { border-color: #E2B93B; box-shadow: inset 4px 0 0 #E2B93B; }
  .star[aria-pressed='true'] { background: #FFF6DB; border-color: #E2B93B; color: #7A5A00; }
  .lnk { background: none; border: 0; color: var(--ink-2); text-decoration: underline; font: inherit; font-size: 14px; cursor: pointer; padding: 6px 4px; }
  .state { font-weight: 600; font-size: 14.5px; }
  .q { font-weight: 600; font-size: 14.5px; margin-right: 2px; }
</style>
