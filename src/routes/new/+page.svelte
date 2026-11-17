<script>
  import Editor from '$lib/components/Editor.svelte';
  import { page } from '$app/state';
  let { data, form } = $props();
</script>

<svelte:head><title>New top 10 · You Should Try</title></svelte:head>
<h1 style="margin:32px 0 0;font-weight:400"><span class="script" style="font-size:40px">make a new</span> <span class="slab" style="font-size:48px">TOP 10</span></h1>
{#if data.withTitle}<p class="muted" style="margin:6px 0 0"><b>{data.withTitle}</b> is already in. Add the rest, then drag it where it belongs.</p>{/if}
<Editor categories={data.categories} preset={data.preset} initial={data.initial} action={data.withTitle ? `?/save&${page.url.searchParams.toString()}` : '?/save'} {form} />
