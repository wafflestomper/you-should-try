<script>
  // Draws taps and swipes on top of the page while "Show my taps" is on. It never blocks a tap.
  import { onMount } from 'svelte';
  import { taps, readTaps } from '$lib/taps.svelte.js';
  let layer;
  onMount(() => {
    readTaps();
    let down = null, last = 0;
    const dot = (x, y, cls) => {
      if (!layer) return;
      const d = document.createElement('span');
      d.className = cls; d.style.left = `${x}px`; d.style.top = `${y}px`;
      layer.appendChild(d);
      setTimeout(() => d.remove(), cls === 'tap' ? 700 : 500);
    };
    const onDown = (e) => { if (!taps.on) return; down = e.pointerId; dot(e.clientX, e.clientY, 'tap'); };
    const onMove = (e) => {
      if (!taps.on || down !== e.pointerId) return;
      const now = performance.now(); if (now - last < 24) return; last = now;
      dot(e.clientX, e.clientY, 'trail');
    };
    const onUp = (e) => { if (down === e.pointerId) down = null; };
    const opts = { capture: true, passive: true };
    window.addEventListener('pointerdown', onDown, opts);
    window.addEventListener('pointermove', onMove, opts);
    window.addEventListener('pointerup', onUp, opts);
    window.addEventListener('pointercancel', onUp, opts);
    // Pages that scroll vertically cancel pointer moves; touchmove still reports the finger
    const onTouch = (e) => { if (!taps.on || down == null) return; const t = e.touches[0]; if (!t) return;
      const now = performance.now(); if (now - last < 24) return; last = now; dot(t.clientX, t.clientY, 'trail'); };
    window.addEventListener('touchmove', onTouch, opts);
    return () => {
      for (const [n, f] of [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onUp], ['touchmove', onTouch]]) window.removeEventListener(n, f, opts);
    };
  });
</script>

<div class="taplayer" bind:this={layer} aria-hidden="true"></div>

<style>
  .taplayer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; }
  .taplayer :global(.tap) {
    position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
    background: rgba(37, 99, 235, .28); border: 3px solid rgba(37, 99, 235, .9); box-shadow: 0 0 0 2px rgba(255, 255, 255, .85);
    animation: tap .7s ease-out forwards;
  }
  .taplayer :global(.trail) {
    position: absolute; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%;
    background: rgba(37, 99, 235, .55); box-shadow: 0 0 0 2px rgba(255, 255, 255, .7);
    animation: trail .5s ease-out forwards;
  }
  @keyframes tap { 0% { transform: scale(.5); opacity: 1; } 35% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.35); opacity: 0; } }
  @keyframes trail { from { opacity: .9; transform: scale(1); } to { opacity: 0; transform: scale(.4); } }
</style>
