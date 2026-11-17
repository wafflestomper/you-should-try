<script>
  let { w = 230, h = 54, word = 'TRY…', size = 26 } = $props();
</script>

<span class="rib" style="width:{w}px;height:{h}px">
  <svg viewBox="0 0 330 76" preserveAspectRatio="none" aria-hidden="true">
    <path d="M30 26 L4 30 L16 46 L4 62 L36 60 Z" fill="none" stroke="#F1F0EA" stroke-width="2" stroke-linejoin="round" />
    <path d="M300 26 L326 30 L314 46 L326 62 L294 60 Z" fill="none" stroke="#F1F0EA" stroke-width="2" stroke-linejoin="round" />
    <path d="M26 14 Q165 2 304 14 L304 60 Q165 48 26 60 Z" fill="#F1F0EA" />
  </svg>
  <span class="blk word" style="font-size:{size}px">{word}</span>
</span>

<style>
  .rib { position: relative; display: inline-block; flex: none; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .word { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; letter-spacing: .06em; color: var(--slate); padding-bottom: 4px; }
</style>
