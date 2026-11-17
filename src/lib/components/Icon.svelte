<script>
  let { name, size = 22 } = $props();
  const P = {
    home: '<path d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z"/>',
    list: '<path d="M9 6 H20 M9 12 H20 M9 18 H20"/><circle cx="5" cy="6" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="5" cy="18" r="1.2"/>',
    plus: '<path d="M12 5 V19 M5 12 H19"/>',
    mark: '<path d="M6 3 H18 V21 L12 17 L6 21 Z"/>',
    people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20 c0 -4 3 -6 6 -6 s6 2 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2 c3 -.4 5.5 1.5 5.5 5.8"/>',
    bell: '<path d="M6 16 V11 a6 6 0 0 1 12 0 V16 L20 18 H4 Z"/><path d="M10 21 h4"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16 L21 21"/>',
    back: '<path d="M15 5 L8 12 L15 19"/>',
    check: '<path d="M5 12.5 L10 17 L19 7"/>'
  };
</script>

<svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none">{@html P[name]}</svg>
