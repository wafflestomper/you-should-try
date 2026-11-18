<script>
  import { onMount } from 'svelte';
  import InstallGuide from '$lib/components/InstallGuide.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import { detect } from '$lib/install.svelte.js';
  let info = $state(null);
  onMount(() => { info = detect(); });
</script>
<svelte:head><title>Put it on your home screen · You Should Try</title></svelte:head>

<div class="hd">
  <Logo size={54} word={false} />
  <div><h1>Put it on your home screen</h1><p>It opens full screen like an app, with its own icon. No app store needed.</p></div>
</div>
<InstallGuide {info} />

<style>
  .hd { display: flex; gap: 14px; align-items: center; margin: 14px 0 6px; }
  h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -.02em; line-height: 1.15; }
  p { margin: 4px 0 0; color: var(--ink-2); }
</style>
