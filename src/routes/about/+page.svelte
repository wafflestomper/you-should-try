<script>
  // Public "what is this?" page, linked from sign-in and the invite request page
  import Logo from '$lib/components/Logo.svelte';
  import Welcome from '$lib/components/Welcome.svelte';
  import SignedOutHero from '$lib/components/SignedOutHero.svelte';
  import IntroVideo from '$lib/components/IntroVideo.svelte';
  let { data } = $props();
</script>

<svelte:head><title>What is You Should Try?</title><meta name="description" content="The shows, books and places friends tell you about, saved in one place with who said it." /></svelte:head>

<div class="look-{data.look ?? 'light'} page">
  <header><a href="/signin" aria-label="You Should Try home"><Logo size={34} tone={data.look === 'dark' ? 'light' : 'ink'} /></a></header>
  <SignedOutHero />
  <p class="cta"><a class="btn dark" href="/request">Ask for an invite</a> <a class="lnk" href="/signin">Already invited? Sign in</a></p>
  <IntroVideo video={data.intro} />
  <Welcome />
  <p class="cta end"><a class="btn dark" href="/request">Ask for an invite</a></p>
</div>

<style>
  header { margin-bottom: 40px; }
  .page { max-width: 440px; margin: 0 auto; padding: 18px 4px 48px; min-height: 100dvh; background: var(--bg); color: var(--ink); }
  .cta { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin: 0; }
  .cta { flex-direction: column; gap: 14px; }
  .cta .btn { min-height: 54px; width: 100%; display: flex; align-items: center; justify-content: center; border-radius: 999px; text-decoration: none; font-size: 17px; font-weight: 800; }
  .cta.end { margin-top: 28px; }
  .lnk { color: var(--ink); font-weight: 700; }
</style>
