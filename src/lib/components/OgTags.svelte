<script>
  // Link preview (iMessage, Slack, email): title, one line, and the preview picture
  import { page } from '$app/state';
  let { title = 'You Should Try', description = 'Keep track of what friends say you should try: shows, books and places, with who said it.' } = $props();
  const image = $derived(`${page.url.origin}/og-invite.jpg`);
</script>

<svelte:head>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="You Should Try" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={page.url.href} />
  <meta property="og:image" content={image} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="You Should Try on a phone: friends' recommendations with who said it" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />
</svelte:head>
