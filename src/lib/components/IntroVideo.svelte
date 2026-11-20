<script>
  // The intro video on invite pages: plays in place, with its cover until tapped
  import { clock } from '$lib/videoTopics.js';
  let { video } = $props();
</script>

{#if video}
  <figure class="intro">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video src="/intro-video/{video.file_key}" poster={video.poster_key ? `/intro-video/${video.poster_key}` : undefined} controls playsinline preload="metadata"
      style="aspect-ratio:{video.width && video.height ? `${video.width} / ${video.height}` : '9 / 16'}"></video>
    <figcaption>{video.title}{video.seconds ? ` · ${clock(video.seconds)}` : ''}</figcaption>
  </figure>
{/if}

<style>
  .intro { margin: 22px 0 0; display: grid; gap: 8px; justify-items: center; }
  video { width: min(100%, 320px); max-height: 70vh; border-radius: 18px; background: #000; display: block; object-fit: contain; box-shadow: 0 12px 30px rgba(0, 0, 0, .16); }
  figcaption { color: var(--ink-2); font-weight: 700; font-size: 14px; text-align: center; }
</style>
