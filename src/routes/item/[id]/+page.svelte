<script>
  import { enhance } from '$app/forms';
  import Cover from '$lib/components/Cover.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Icon from '$lib/components/Icon.svelte';
  let { data, form } = $props();
  const HAD = { book: "I've read it", audiobook: "I've listened to it", movie: "I've seen it", tv: "I've watched it", restaurant: "I've been", recipe: "I've made it" };
  let onMyList = $derived(data.rankedOn.some((r) => r.user_id === data.user?.id));
  let to = $state('');
  let note = $state('');
  const KIND = { book: 'Book', audiobook: 'Audiobook', movie: 'Movie', tv: 'TV show', restaurant: 'Restaurant', recipe: 'Recipe' };
  let avg = $derived(data.rankedOn.length ? (data.rankedOn.reduce((s, r) => s + Math.min(r.position, 11), 0) / data.rankedOn.length).toFixed(1) : '–');
  let fromOther = $derived(data.rankedOn.find((r) => r.user_id !== data.user?.id));
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
</script>

<svelte:head><title>{data.item.title} · You Should Try</title></svelte:head>

<div class="head">
  <Cover title={data.item.title} kind={data.item.kind} image={data.item.image_url} w={180} />
  <div>
    <div class="cap" style="font-size:12px;color:var(--ink-2)">{KIND[data.item.kind]}{data.item.year ? ` · ${data.item.year}` : ''}</div>
    <h1 class="slab" style="font-size:clamp(34px,5vw,56px);margin:6px 0 0;line-height:1.05">{data.item.title}</h1>
    {#if data.item.creator}<p class="muted" style="font-size:18px;margin:6px 0 0">{data.item.creator}</p>{/if}
    {#if data.item.narrator}<p style="margin:8px 0 0">Read by <b>{data.item.narrator}</b>. Audiobook lists rank the performance as well as the story.</p>{/if}
    {#if data.dishes.length}<p class="script" style="font-size:28px;color:var(--green);margin:8px 0 0">get the {data.dishes[0].dish}</p>{/if}
    <div class="stats">
      <div><div class="slab big">{data.rankedOn.length}</div><div class="small muted">lists it's on</div></div>
      <div><div class="slab big">{avg}</div><div class="small muted">average spot</div></div>
    </div>
    <form method="POST" action="?/try" use:enhance>
      <input type="hidden" name="saved" value={data.saved ? '1' : '0'} />
      {#if fromOther}<input type="hidden" name="list" value={fromOther.list_id} />{/if}
      <div class="acts">
        {#if !data.done}<button class="btn" class:dark={!data.saved}><Icon name="mark" size={18} />{data.saved ? 'On your try list' : 'Add to try list'}</button>{/if}
        {#if !onMyList && !data.done}<a class="btn" href="/try/{data.item.id}/done">{HAD[data.item.kind]}</a>{/if}
        {#if data.done}<span class="small muted">You marked this done{data.done === 'loved' ? ' and loved it' : ''}.</span>{/if}
      </div>
    </form>
    {#if data.tags.length}<div style="margin-top:18px"><div class="small faint">Suggested tags</div><div class="tags" style="margin-top:6px">{#each data.tags as t}<span class="tag">{t}</span>{/each}</div></div>{/if}
  </div>
</div>

<section class="send">
  <h2 class="script" style="font-size:34px;margin:0;font-weight:400">You should try this</h2>
  <p class="small muted" style="margin:2px 0 12px">Send it to one person. It lands on their home page with your note.</p>
  <form method="POST" action="?/send" use:enhance={() => async ({ result, update }) => { await update({ reset: false }); if (result.type === 'success') { to = ''; note = ''; } }}>
    <label class="sr" for="send-to">Send to</label>
    <select id="send-to" name="to" bind:value={to} required>
      <option value="" disabled>Pick a person</option>
      {#each data.people as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
    </select>
    <label class="sr" for="send-note">Note</label>
    <input id="send-note" name="note" bind:value={note} maxlength="280" placeholder="Why they'd like it (optional)" />
    <button class="btn dark" disabled={!to}>Send it</button>
  </form>
  {#if form?.sentName}<p class="ok" role="status">Sent to {form.sentName}.</p>{/if}
  {#if form?.sendError}<p class="bad" role="alert">{form.sendError}</p>{/if}
  {#if data.sentTo.length}<p class="small muted" style="margin:8px 0 0">You've sent this to {data.sentTo.map((s) => s.name.split(' ')[0]).join(', ')}.</p>{/if}
</section>

{#if data.dishes.length}
  <h2 class="h2" style="margin-top:40px">What to order</h2><div class="rule"></div>
  {#each data.dishes as d}<div class="item"><span>{cap(d.dish)}</span><span class="fill"></span><span class="no">{d.n} list{d.n > 1 ? 's' : ''}</span></div>{/each}
{/if}

<h2 class="h2" style="margin-top:40px">Who ranked it</h2><div class="rule"></div>
{#each data.rankedOn as r}
  <a class="who" href="/list/{r.list_id}">
    <Avatar name={r.user_name} color={r.user_color} />
    <div style="flex:1"><div><b>{r.user_id === data.user?.id ? 'You' : r.user_name}</b> {r.user_id === data.user?.id ? 'have' : 'has'} it at <b>No. {r.position}</b> on {r.list_title}</div>
      {#if r.why}<div class="serif" style="font-style:italic;color:var(--ink-2)">“{r.why}”</div>{/if}</div>
  </a>
{:else}
  <p class="muted">Nobody has ranked this yet.</p>
{/each}

<style>
  .head { display: flex; gap: 34px; align-items: flex-start; margin-top: 32px; flex-wrap: wrap; }
  .stats { display: flex; gap: 34px; margin: 20px 0; }
  .big { font-size: 48px; line-height: 1; }
  .acts { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .send { margin-top: 40px; padding: 22px 24px; background: var(--slate); color: var(--chalk); border-radius: 4px; }
  .send .muted { color: var(--chalk-2); }
  .send form { display: flex; gap: 10px; flex-wrap: wrap; }
  .send select, .send input { min-height: 44px; padding: 0 12px; border-radius: 4px; border: 1.5px solid var(--chalk-2); font: 15px var(--body); background: var(--chalk); color: var(--ink); }
  .send input { flex: 1 1 260px; }
  .send .btn.dark { background: var(--chalk-yellow); color: var(--slate); border-color: var(--chalk-yellow); }
  .send .btn[disabled] { opacity: .55; cursor: not-allowed; }
  .ok { color: var(--chalk-yellow); font-weight: 600; margin: 10px 0 0; }
  .bad { color: #FFB4A8; font-weight: 600; margin: 10px 0 0; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .who { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--line); text-decoration: none; color: var(--ink); }
</style>
