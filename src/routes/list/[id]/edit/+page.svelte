<script>
  import Editor from '$lib/components/Editor.svelte';
  let { data, form } = $props();
  let confirming = $state(false);
</script>

<svelte:head><title>Edit {data.list.title} · You Should Try</title></svelte:head>
<h1 style="margin:32px 0 0;font-weight:400"><span class="script" style="font-size:40px">edit</span> <span class="slab" style="font-size:44px">{data.list.title}</span></h1>
<Editor categories={data.categories} initial={data.list} {form} />

<div style="margin-top:40px;border-top:1px solid var(--line);padding-top:18px">
  {#if confirming}
    <form method="POST" action="?/delete" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <span>Delete this list for good? It can't be undone.</span>
      <button class="btn sm dark">Delete list</button>
      <button type="button" class="btn sm" onclick={() => (confirming = false)}>Keep it</button>
    </form>
  {:else}
    <button type="button" class="btn sm" style="border-color:#E3B3AE;color:#B42318" onclick={() => (confirming = true)}>Delete this list</button>
  {/if}
</div>
