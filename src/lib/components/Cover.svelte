<script>
  // Stand-in cover until real art comes from TMDB, Open Library, or the restaurant.
  let { title = '', kind = 'book', w = 56 } = $props();
  const PAL = ['#22395B','#7E2A35','#3C5A40','#A9811E','#56345A','#1D6D74','#A65B1C','#2D3142','#62866A','#9C3B46','#264A68','#6F6152'];
  let color = $derived.by(() => { let h = 0; for (const c of title + kind) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PAL[h % PAL.length]; });
  let h = $derived(kind === 'audiobook' || kind === 'restaurant' || kind === 'recipe' ? w : Math.round(w * 1.5));
</script>

<div class="cover {kind}" aria-hidden="true" style="width:{w}px;height:{h}px;background:{color};font-size:{Math.max(9, Math.round(w * 0.15))}px;padding:{Math.max(4, Math.round(w * 0.08))}px">
  {title}
</div>

<style>
  .cover { flex: none; color: #FDFAF2; display: flex; align-items: flex-end; overflow: hidden; line-height: 1.05;
    font-family: var(--serif); font-weight: 700; border-radius: 2px 4px 4px 2px; box-shadow: inset 3px 0 0 rgba(0,0,0,.18); }
  .movie, .tv { font-family: var(--block); font-weight: 800; border-radius: 4px; box-shadow: none; }
  .audiobook { border-radius: 5px; box-shadow: none; }
  .restaurant, .recipe { border-radius: 50%; align-items: center; justify-content: center; text-align: center; font-family: var(--slab); font-weight: 400; box-shadow: inset 0 0 0 3px rgba(255,255,255,.35); }
</style>
