<script>
  // A small "Show me" link to the how-to video for this spot, only when one exists
  import { page } from '$app/state';
  let { topic, label = 'Show me how' } = $props();
  const v = $derived(page.data.videoTopics?.find((x) => x.topic === topic));
</script>

{#if v}
  <a class="showme" href="/help?v={v.id}">
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".15"/><path fill="currentColor" d="M10 8v8l6-4z"/></svg>{label}
  </a>
{/if}

<style>
  .showme { display: inline-flex; align-items: center; gap: 6px; font: 700 13.5px Manrope, sans-serif; color: var(--ink-2); text-decoration: none; min-height: 32px; }
  .showme:hover { color: var(--ink); text-decoration: underline; }
</style>
