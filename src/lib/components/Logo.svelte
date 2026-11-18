<script>
  // You Should Try… mark: a speech bubble whose "…" is three dots in the board's main type colors.
  let { size = 30, word = true, tone = 'ink' } = $props();
</script>

<span class="logo" class:light={tone === 'light'} aria-label="You should try">
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <path class="bub" d="M32 6C16.5 6 5 16.4 5 29.5c0 7.1 3.4 13.4 8.9 17.7L11 58l13.2-6.6c2.5.6 5.1.9 7.8.9 15.5 0 27-10.4 27-23.3S47.5 6 32 6Z" />
    <circle cx="20.5" cy="29.5" r="4.6" fill="#3563E9" />
    <circle cx="32" cy="29.5" r="4.6" fill="#E23A5F" />
    <circle cx="43.5" cy="29.5" r="4.6" fill="#14A396" />
  </svg>
  {#if word}<span class="w">you should <b>try</b></span>{/if}
</span>

<style>
  .logo { display: inline-flex; align-items: center; gap: 8px; line-height: 1; }
  .bub { fill: var(--logo-bubble, #111113); }
  .light .bub { fill: #fff; }
  .w { font-family: Manrope, system-ui, sans-serif; font-weight: 700; font-size: 21px; letter-spacing: -.035em; color: var(--ink); white-space: nowrap; }
  .w b { font-weight: 800; }
  .light .w { color: #fff; }
</style>
