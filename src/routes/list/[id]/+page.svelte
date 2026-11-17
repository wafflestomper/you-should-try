<script>
  import { enhance } from '$app/forms';
  import Avatar from '$lib/components/Avatar.svelte';
  import Cover from '$lib/components/Cover.svelte';
  import Icon from '$lib/components/Icon.svelte';
  let { data } = $props();
  let mine = $derived(data.list.owner_id === data.user?.id);
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  import { page } from '$app/state';
  let added = $derived(page.url.searchParams.get('added'));
  let addedAt = $derived(added ? [...data.top, ...data.bench].find((e) => e.item_id === added) : null);
</script>

<svelte:head><title>{data.list.title} · You Should Try</title></svelte:head>

<header class="head">
  <div>
    <h1 class="slab title">{data.list.title}</h1>
    <div class="cap sub2">{data.list.subtitle}</div>
    <div class="by">
      <a href="/people/{data.list.owner_id}" class="owner"><Avatar name={data.list.owner_name} color={data.list.owner_color} size={28} />{mine ? 'Your list' : data.list.owner_name}</a>
      {#if data.match != null}<span class="match">{data.match}% taste match with you</span>{/if}
      <div class="tags">{#each data.tags as t}<span class="tag">{t}</span>{/each}</div>
    </div>
  </div>
  {#if mine}<a class="btn dark" href="/list/{data.list.id}/edit">Edit or add picks</a>{/if}
</header>

{#if addedAt}<p class="added" role="status"><b>{addedAt.title}</b> is in at {addedAt.position <= 10 ? `No. ${addedAt.position}` : 'honorable mention'}.</p>{/if}
<div class="rule"></div>
<ol class="ranks">
  {#each data.top as e}
    <li class:fresh={e.item_id === added}>
      <span class="slab num">{e.position}</span>
      <Cover title={e.title} kind={e.kind} image={e.image_url} w={44} />
      <div class="info">
        <a class="serif it" href="/item/{e.item_id}">{e.dish ? `${cap(e.dish)}, ${e.title}` : e.title}</a>
        <div class="small muted">{e.creator ?? ''}{e.narrator ? ` · read by ${e.narrator}` : ''}{e.year ? ` · ${e.year}` : ''}</div>
        {#if e.why}<div class="script why">{e.why}</div>{/if}
      </div>
      <div class="acts">
        {#if e.on_lists > 1}<a class="small" href="/item/{e.item_id}">On {e.on_lists} lists</a>{/if}
        {#if !mine}
          <form method="POST" action="?/try" use:enhance>
            <input type="hidden" name="item" value={e.item_id} /><input type="hidden" name="saved" value={e.saved ? '1' : '0'} />
            <button class="btn sm" class:dark={e.saved} aria-pressed={e.saved}><Icon name="mark" size={16} />{e.saved ? 'On your try list' : 'Try it'}</button>
          </form>
        {/if}
      </div>
    </li>
  {/each}
</ol>

{#if data.bench.length}
  <h2 class="h2" style="margin-top:36px">Honorable mentions</h2><div class="sub">Bumped out of the top 10, kept in order</div><div class="rule"></div>
  {#each data.bench as e}
    <div class="item"><a href="/item/{e.item_id}" style="color:var(--ink);text-decoration:none">{e.title}</a><span class="fill"></span><span class="no">No. {e.position}</span></div>
  {/each}
{/if}

<style>
  .added { margin: 14px 0 0; color: var(--ok); }
  .fresh { background: #FBF8EC; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; margin-top: 32px; }
  .title { font-size: clamp(36px, 5vw, 60px); line-height: 1.02; margin: 0; }
  .sub2 { font-size: 13px; color: var(--ink-2); margin-top: 8px; }
  .by { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
  .owner { display: flex; align-items: center; gap: 8px; color: var(--ink); text-decoration: none; font-weight: 600; }
  .match { font-size: 13px; font-weight: 700; border: 1.5px solid var(--ink); border-radius: 14px; padding: 2px 10px; }
  .ranks { list-style: none; margin: 0; padding: 0; }
  .ranks li { display: flex; gap: 16px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
  .num { font-size: 34px; width: 52px; text-align: center; }
  .info { flex: 1 1 260px; min-width: 0; }
  .it { font-size: 19px; font-weight: 700; color: var(--ink); text-decoration: none; }
  .it:hover { text-decoration: underline; }
  .why { font-size: 21px; color: var(--green); margin-top: 2px; }
  .acts { display: flex; gap: 12px; align-items: center; }
  @media (max-width: 640px) { .num { width: 34px; font-size: 26px; } .acts { width: 100%; padding-left: 50px; } }
</style>
