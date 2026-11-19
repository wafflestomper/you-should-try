<script>
  // Public "what is this?" page, linked from sign-in and the invite request page
  import Logo from '$lib/components/Logo.svelte';
  import Welcome from '$lib/components/Welcome.svelte';
  let { data } = $props();
</script>

<svelte:head><title>What is You Should Try?</title><meta name="description" content="The shows, books and places friends tell you about, saved in one place with who said it." /></svelte:head>

<div class="look-{data.look ?? 'light'} page">
  <a href="/signin" aria-label="You Should Try home"><Logo size={34} tone={data.look === 'dark' ? 'light' : 'ink'} /></a>
  <h1>Keep track of what friends say you should try.</h1>
  <p class="lead">When someone says "you have to watch this" or "read this," it goes on one shared board for your group of friends. Later, when you're looking for something, it's all there with who said it.</p>
  <p class="cta"><a class="btn dark" href="/request">Ask for an invite</a> <a class="lnk" href="/signin">Already invited? Sign in</a></p>
  <Welcome />
  <p class="cta end"><a class="btn dark" href="/request">Ask for an invite</a></p>
</div>

<style>
  .page { max-width: 520px; margin: 0 auto; padding: 28px 18px 48px; min-height: 100dvh; background: var(--bg); color: var(--ink); }
  h1 { margin: 26px 0 8px; font-size: 30px; line-height: 1.1; font-weight: 800; letter-spacing: -.025em; }
  .lead { margin: 0 0 14px; color: var(--ink-2); line-height: 1.5; }
  .cta { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin: 0; }
  .cta .btn { min-height: 48px; display: inline-flex; align-items: center; padding: 0 20px; border-radius: 999px; text-decoration: none; }
  .cta.end { margin-top: 28px; }
  .lnk { color: var(--ink); font-weight: 700; }
</style>
