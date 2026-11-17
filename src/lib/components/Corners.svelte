<script>
  let { size = 80 } = $props();
  const spots = [
    ['top:6px;left:6px;', ''], ['top:6px;right:6px;', 'transform:scaleX(-1);'],
    ['bottom:6px;left:6px;', 'transform:scaleY(-1);'], ['bottom:6px;right:6px;', 'transform:scale(-1,-1);']
  ];
</script>

{#each spots as [place, flip]}
  <svg viewBox="0 0 110 110" fill="none" stroke="#F1F0EA" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"
    style="position:absolute;{place}width:{size}px;height:{size}px;{flip}pointer-events:none">
    <path d="M8 100 C8 44 44 8 100 8" /><path d="M18 64 C18 36 36 18 64 18" />
    <path d="M18 64 c0 10 -12 12 -12 2 c0 -6 8 -6 8 0" /><path d="M64 18 c10 0 12 -12 2 -12 c-6 0 -6 8 0 8" />
    <path d="M30 40 c-8 -10 2 -20 10 -12 c6 6 -2 14 -6 8" /><circle cx="24" cy="24" r="3" fill="#F1F0EA" />
  </svg>
{/each}
