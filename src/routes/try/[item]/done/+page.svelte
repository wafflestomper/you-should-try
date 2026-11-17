<script>
  import Cover from '$lib/components/Cover.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Faceoff from '$lib/components/Faceoff.svelte';
  import { tick } from 'svelte';
  let { data, form } = $props();

  const VERB = { book: 'read', audiobook: 'listened to', movie: 'watched', tv: 'watched', restaurant: 'ate at', recipe: 'made' };
  const HOW = { book: 'How was the book?', audiobook: 'How was the listen?', movie: 'How was the movie?', tv: 'How was the show?', restaurant: 'How was the meal?', recipe: 'How did it turn out?' };
  const first = (n) => n?.split(' ')[0];

  let reaction = $state(null);
  let facing = $state(null);
  let formEl;
  let f = $state({ reaction: '', list: '', index: '' });

  async function submit(vals) {
    f = { reaction: reaction ?? 'loved', list: '', index: '', ...vals };
    await tick();
    formEl.requestSubmit();
  }
  function pickList(l) {
    if (l.has_it) return;
    if (l.top.length === 0) return submit({ list: l.id, index: 0 });
    facing = l;
  }
</script>

<svelte:head><title>{data.item.title} · You Should Try</title></svelte:head>

<form method="POST" action="?/place" bind:this={formEl} hidden>
  <input name="reaction" value={f.reaction} /><input name="list" value={f.list} /><input name="index" value={f.index} />
</form>

<section class="head">
  <Cover title={data.item.title} kind={data.item.kind} image={data.item.image_url} w={96} />
  <div>
    <p class="muted small" style="margin:0">You {VERB[data.item.kind]}</p>
    <h1 class="serif">{data.item.title}</h1>
    {#if data.item.creator}<p class="muted" style="margin:2px 0 0">{data.item.creator}</p>{/if}
    {#if data.from}
      <p class="from"><Avatar name={data.from.name} color={data.from.color} size={24} />
        {first(data.from.name)} told you to try this{data.from.rank ? `. It's their No. ${data.from.rank}` : ''}.</p>
    {/if}
  </div>
</section>

{#if form?.error}<p class="err" role="alert">{form.error}</p>{/if}

<div class="rule"></div>

<h2 class="q">{HOW[data.item.kind]}</h2>
<div class="react" role="group" aria-label="How was it">
  <button type="button" class="btn" class:dark={reaction === 'loved'} aria-pressed={reaction === 'loved'} onclick={() => (reaction = 'loved')}>Loved it</button>
  <button type="button" class="btn" class:dark={reaction === 'fine'} aria-pressed={reaction === 'fine'} onclick={() => (reaction = 'fine')}>It was fine</button>
  <button type="button" class="btn" class:dark={reaction === 'not_for_me'} aria-pressed={reaction === 'not_for_me'} onclick={() => (reaction = 'not_for_me')}>Not for me</button>
</div>

{#if reaction === 'not_for_me'}
  <p class="note">That stays between you and the site{data.from ? `. ${first(data.from.name)} won't hear about it` : ''}.</p>
  <button type="button" class="btn dark" onclick={() => submit({})}>Mark it done</button>
{:else if reaction}
  <h2 class="q">Does it make one of your lists?</h2>
  {#if data.from}<p class="note">If it lands on a list, {first(data.from.name)} gets told where. If not, they hear nothing.</p>{/if}
  {#if data.lists.length}
    <ul class="lists">
      {#each data.lists as l (l.id)}
        <li>
          <button type="button" class="pick" disabled={!!l.has_it} onclick={() => pickList(l)}>
            <span class="lt">{l.title}</span>
            <span class="small muted">{l.subtitle}{l.subtitle ? ' · ' : ''}{l.has_it ? 'already on it' : l.n >= 10 ? 'full, so it has to beat your No. 10' : `${l.n} so far`}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">You don't have a list this would fit yet.</p>
  {/if}
  <div class="row">
    <a class="btn" href="/new?with={data.item.id}&reaction={reaction}{data.from ? `&from=${data.from.id}` : ''}">Start a new list with it</a>
    <button type="button" class="btn" onclick={() => submit({})}>No list, just mark it done</button>
  </div>
{/if}

{#if facing}
  <Faceoff top={facing.top} item={data.item} listTitle={facing.title}
    onplace={(i) => submit({ list: facing.id, index: i })} oncancel={() => (facing = null)} />
{/if}

<style>
  .head { display: flex; gap: 22px; align-items: center; margin-top: 32px; }
  h1 { margin: 2px 0 0; font-size: 34px; line-height: 1.15; }
  .from { display: flex; align-items: center; gap: 8px; margin: 10px 0 0; }
  .q { font: 400 30px var(--script, cursive); margin: 26px 0 12px; }
  .react, .row { display: flex; gap: 10px; flex-wrap: wrap; }
  .row { margin-top: 16px; }
  .note { margin: 0 0 14px; max-width: 60ch; }
  .lists { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
  .pick { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; background: none; border: 0; border-bottom: 1px solid var(--line); padding: 14px 4px; cursor: pointer; font: inherit; color: inherit; }
  .pick:hover:not([disabled]), .pick:focus-visible { background: rgba(47, 93, 80, .07); }
  .pick[disabled] { opacity: .5; cursor: default; }
  .lt { font: 700 19px var(--serif, serif); }
  .err { color: #9B2C1F; font-weight: 600; }
  @media (max-width: 560px) { .head { align-items: flex-start; } h1 { font-size: 26px; } }
</style>
