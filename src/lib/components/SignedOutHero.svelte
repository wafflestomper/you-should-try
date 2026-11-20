<script>
  // The top of every signed-out page (sign in, invite, about), in the same type as the app itself
  let { kicker = '', lead = 'When someone says "you have to watch this" or "read this," it goes on one shared board for your group of friends. Later, when you\'re looking for something, it\'s all there with who said it.' } = $props();
</script>

<div class="hero">
  {#if kicker}<p class="kicker">{kicker}</p>{/if}
  <h1>Keep track of what friends say you should try.</h1>
  <p class="lead">{lead}</p>
</div>

<style>
  .hero { margin: 0 0 22px; }
  .kicker { margin: 0 0 8px; font-weight: 800; color: var(--ink-2); font-size: 16px; }
  h1 { margin: 0; font-size: 32px; line-height: 1.1; font-weight: 800; letter-spacing: -.025em; }
  .lead { margin: 12px 0 0; font-size: 17px; line-height: 1.5; color: var(--ink-2); }
  @media (max-width: 360px) { h1 { font-size: 28px; } }
</style>
