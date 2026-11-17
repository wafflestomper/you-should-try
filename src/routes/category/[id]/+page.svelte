<script>
  import ListCard from '$lib/components/ListCard.svelte';
  let { data } = $props();
</script>

<svelte:head><title>Top 10 {data.category.name} · You Should Try</title></svelte:head>

<h1 class="slab" style="font-size:clamp(34px,5vw,56px);margin:32px 0 0;line-height:1.05">Top 10 {data.category.name}</h1>
<p class="muted" style="margin:8px 0 0">The group's favorites: 10 points for a No. 1, 1 point for a No. 10, added across {data.lists.length} lists.</p>
<div class="rule" style="margin-top:18px"></div>
{#each data.consensus as c, i}
  <div class="item"><span class="slab" style="width:34px">{i + 1}</span><a href="/item/{c.id}" style="color:var(--ink);text-decoration:none">{c.title}</a><span class="fill"></span><span class="no">{c.pts} pts · {c.lists} list{c.lists > 1 ? 's' : ''}</span></div>
{:else}
  <p class="muted">No lists here yet. <a href="/new">Make the first one.</a></p>
{/each}

<h2 class="h2" style="margin-top:44px">The lists</h2><div class="rule"></div>
<div class="grid">{#each data.lists as l}<ListCard {l} />{/each}</div>

<style>.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; }</style>
