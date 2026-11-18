<script>
  import { page } from '$app/state';
  import Logo from '$lib/components/Logo.svelte';
  $effect(() => { try { sessionStorage.removeItem('yst_reloaded'); } catch {} });
</script>

<svelte:head><title>Something went wrong · You Should Try</title></svelte:head>

<div class="er">
  {#if !page.data?.user}<Logo size={30} />{/if}
  {#if page.status === 404}
    <h1>That page isn't here</h1>
    <p>It may have been removed, or the link has a typo.</p>
  {:else}
    <h1>That didn't work</h1>
    <p>{page.error?.message ?? 'Something went wrong.'}</p>
    <p class="muted">If the site was just updated, reloading fixes it.</p>
  {/if}
  <div class="row">
    {#if page.status !== 404}<button class="btn dark" onclick={() => location.reload()}>Reload</button>{/if}
    <a class="btn" href="/">Back to the board</a>
  </div>
</div>

<style>
  .er { max-width: 460px; margin: 30px auto; display: grid; gap: 10px; }
  h1 { margin: 18px 0 0; font: italic 400 40px/1.05 "Instrument Serif", Georgia, serif; }
  p { margin: 0; line-height: 1.5; }
  .muted { color: var(--ink-2); }
  .row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .row .btn { min-height: 48px; padding: 0 20px; display: inline-flex; align-items: center; text-decoration: none; }
</style>
