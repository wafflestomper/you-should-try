<script>
  import Avatar from '$lib/components/Avatar.svelte';
  import ListCard from '$lib/components/ListCard.svelte';
  let { data } = $props();
</script>
<svelte:head><title>{data.person.name} · You Should Try</title></svelte:head>
<div style="display:flex;gap:18px;align-items:center;margin-top:32px"><Avatar name={data.person.name} color={data.person.color} size={64} />
  <div><h1 class="slab" style="font-size:44px;margin:0;line-height:1">{data.person.name}</h1>
  {#if data.person.invited_by_name}<p class="small muted" style="margin:6px 0 0">Invited by {data.person.invited_by_name}: “{data.person.knows_note}”</p>{/if}</div></div>
<div class="rule" style="margin-top:22px"></div>
<div class="grid">{#each data.lists as l}<ListCard {l} />{:else}<p class="muted">No lists yet.</p>{/each}</div>
<style>.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; }</style>
