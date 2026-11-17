<script>
  import Editor from '$lib/components/Editor.svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>New top 10 · You Should Try</title></svelte:head>
<h1 style="margin:32px 0 0;font-weight:400"><span class="script" style="font-size:40px">make a new</span> <span class="slab" style="font-size:48px">TOP 10</span></h1>
<Editor categories={data.categories} preset={data.preset} {form} />
