<script>
  import Logo from '$lib/components/Logo.svelte';
  let { data } = $props();
</script>

<svelte:head><title>Privacy · You Should Try</title></svelte:head>

<article class="look-{data.look ?? 'light'} pv">
  <a href="/" class="home"><Logo size={30} tone={data.look === 'dark' ? 'light' : 'ink'} /></a>
  <h1>Privacy</h1>
  <p class="lead">You Should Try is a small, invite-only site for a group of friends and coworkers to keep track of recommendations. It's free, has no ads, and isn't a business.</p>

  <h2>What it keeps</h2>
  <ul>
    <li><b>From Google sign-in:</b> your name, email address and Google account ID. That's all it asks Google for. It never sees your password, contacts, files or mail.</li>
    <li><b>What you add:</b> recommendations, notes, who recommended something, and your own reactions (done, starred, "not for me").</li>
    <li><b>Settings you choose,</b> like your display name, light or dark look, and the libraries you check.</li>
    <li><b>A sign-in cookie</b> so you stay signed in. There are no tracking or advertising cookies.</li>
  </ul>

  <h2>Who can see it</h2>
  <ul>
    <li>Recommendations and who made them are visible to the other members.</li>
    <li>When you mark something loved or liked, the person who recommended it can see that. "Not for me" and "Just for my list" picks are private to you.</li>
    <li>Your email address isn't shown to other members.</li>
  </ul>

  <h2>Who else touches it</h2>
  <p>The site runs on Cloudflare. Invite emails are sent through Resend, which sees only the invite email itself. Covers, "where to watch" and library availability come from TMDB, Open Library and a library lookup service, which get only the title being looked up and the library you picked. Voice notes are turned into text on Cloudflare and aren't saved. Nothing is sold or shared with anyone else.</p>

  <h2>Leaving</h2>
  <p>Ask Z (who runs the site) to remove your account, and your account and everything you added will be deleted. You can also remove your own recommendations at any time.</p>

  <p class="small">Last updated November 2026.</p>
</article>

<style>
  .pv { max-width: 620px; margin: 0 auto; padding: 18px 4px 48px; color: var(--ink); line-height: 1.55; }
  .home { display: inline-block; margin-bottom: 26px; text-decoration: none; }
  h1 { margin: 0 0 12px; font-size: 32px; line-height: 1.1; font-weight: 800; letter-spacing: -.025em; }
  .lead { color: var(--ink-2); font-size: 17px; margin: 0 0 8px; }
  h2 { font-size: 18px; font-weight: 800; margin: 26px 0 6px; }
  ul { padding-left: 20px; margin: 0; display: grid; gap: 6px; }
  p { margin: 0; }
  .small { color: var(--ink-3); font-size: 13px; margin-top: 30px; }
</style>
