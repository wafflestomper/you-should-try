<script>
  let { name = '', color = '#2A2E2C', size = 34 } = $props();
  let initials = $derived(name === 'Z' ? 'Z' : name.split(' ').map((p) => p[0]).join('').slice(0, 2));
</script>

<span class="av" style="background:{color};width:{size}px;height:{size}px;font-size:{Math.round(size * 0.38)}px" aria-hidden="true">{initials}</span>
