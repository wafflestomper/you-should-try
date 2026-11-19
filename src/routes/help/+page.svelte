<script>
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { clock, topicLabel } from '$lib/videoTopics.js';
  let { data } = $props();

  const openId = $derived(page.url.searchParams.get('v'));
  const open = $derived(data.videos.find((v) => v.id === openId) ?? null);
  const idx = $derived(open ? data.videos.indexOf(open) : -1);
  const nextUp = $derived(idx >= 0 ? data.videos[idx + 1] ?? null : null);
  let ended = $state(false);
  $effect(() => { openId; ended = false; });

  const show = (v) => goto(v ? `/help?v=${v.id}` : '/help', { replaceState: !!open, noScroll: true, keepFocus: true });
  function onkey(e) { if (e.key === 'Escape' && open) show(null); }
</script>

<svelte:window onkeydown={onkey} />
<svelte:head><title>How to · You Should Try</title></svelte:head>

<h1>How to</h1>
<p class="lead">Short videos, a minute or two each. Tap one to watch.</p>

{#if data.videos.length}
  <ul class="list">
    {#each data.videos as v (v.id)}
      <li>
        <button class="row" onclick={() => show(v)}>
          <span class="th">
            {#if v.poster_key}<img src="/v/{v.poster_key}" alt="" loading="lazy" />{/if}
            <span class="play" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></svg></span>
          </span>
          <span class="tx">
            <b>{v.title}</b>
            {#if v.blurb}<span class="bl">{v.blurb}</span>{/if}
            <span class="mt">{clock(v.seconds)}{v.topic ? ` · ${topicLabel(v.topic)}` : ''}</span>
          </span>
        </button>
      </li>
    {/each}
  </ul>
{:else}
  <p class="empty">No videos yet. Z is making some.{#if page.data.realUser?.is_admin}{' '}Add one on the <a href="/admin#videos">Admin page</a>.{/if}</p>
{/if}

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="sheet" onclick={(e) => { if (e.target === e.currentTarget) show(null); }}>
    <div class="player" role="dialog" aria-modal="true" aria-label={open.title}>
      <div class="ph">
        <b>{open.title}</b>
        <button class="x" onclick={() => show(null)} aria-label="Close video"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
      </div>
      {#key open.id}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video src="/v/{open.file_key}" poster={open.poster_key ? `/v/${open.poster_key}` : undefined} controls autoplay playsinline preload="auto"
          style="aspect-ratio:{open.width && open.height ? `${open.width} / ${open.height}` : '9 / 16'}" onended={() => (ended = true)}></video>
      {/key}
      {#if nextUp}
        <button class="next" class:hot={ended} onclick={() => show(nextUp)}>Next: {nextUp.title}</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  h1 { margin: 20px 0 4px; }
  .lead { color: var(--ink-2); margin: 0 0 14px; }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .row { width: 100%; display: grid; grid-template-columns: 76px 1fr; gap: 14px; align-items: center; text-align: left; padding: 10px; border: 0; border-radius: 16px; background: var(--surface); color: var(--ink); cursor: pointer; font: inherit; }
  .row:focus-visible { outline: 3px solid #2563EB; outline-offset: 2px; }
  .th { position: relative; width: 76px; aspect-ratio: 9 / 16; border-radius: 12px; overflow: hidden; background: var(--surface-2); display: block; }
  .th img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .play { position: absolute; inset: 0; margin: auto; width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; display: grid; place-items: center; }
  .play svg { margin-left: 2px; }
  .tx { display: grid; gap: 3px; }
  .tx b { font-size: 17px; line-height: 1.25; }
  .bl { color: var(--ink-2); font-size: 14.5px; line-height: 1.35; }
  .mt { color: var(--ink-2); font-size: 13px; font-weight: 700; }
  .empty { background: var(--surface); padding: 16px; border-radius: 16px; }

  .sheet { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,.82); display: grid; place-items: center; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); }
  .player { width: min(100%, 460px); max-height: 100%; display: grid; gap: 10px; grid-template-rows: auto minmax(0, 1fr) auto; }
  .ph { display: flex; justify-content: space-between; align-items: center; gap: 10px; color: #fff; font-size: 16px; }
  .x { width: 44px; height: 44px; border-radius: 50%; border: 0; background: rgba(255,255,255,.16); color: #fff; display: grid; place-items: center; cursor: pointer; flex: none; }
  video { width: 100%; max-height: calc(100dvh - 150px); border-radius: 14px; background: #000; display: block; object-fit: contain; margin: 0 auto; }
  .next { min-height: 46px; border-radius: 12px; border: 0; background: rgba(255,255,255,.16); color: #fff; font: 800 15px Manrope, sans-serif; cursor: pointer; padding: 0 14px; transition: background .3s; }
  .next.hot { background: #fff; color: #111; }
</style>
