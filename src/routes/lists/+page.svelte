<script>
  import ListCard from '$lib/components/ListCard.svelte';
  let { data } = $props();
</script>
<svelte:head><title>All lists · You Should Try</title></svelte:head>
<h1 class="slab" style="font-size:48px;margin:32px 0 0">Every list</h1>
<div class="rule" style="margin-top:16px"></div>
<div class="grid">{#each data.lists as l}<ListCard {l} />{/each}</div>
<style>.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; }</style>
