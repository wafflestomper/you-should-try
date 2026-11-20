<script>
  // What this is, for people who've never seen it: used on invite pages and the public /about page.
  // The screenshots come from a demo board with made-up people, not anyone's real picks.

  const steps = [
    {
      img: 'add', alt: 'The add screen with a big microphone button and the prompt "Who said what?"',
      title: 'Someone says "you have to watch this"',
      body: 'Tap the microphone and say it the way you would to a friend: "Sam said watch Slow Horses." It works out what the show is and who told you. Typing works too.'
    },
    {
      img: 'board', alt: 'The board with recommendation cards for Slow Horses and Yellowjackets, each marked New, with a friend\'s note',
      title: 'It goes on the board, with who said it',
      body: "Everything friends recommend lands in one place, with their note about why, and new ones are marked so you see them first. Picks other people added show up on your board too. If you've already seen one, tap Watched it and choose whether you loved it, liked it, or it wasn't for you. Those ratings help everyone else find the great ones."
    },
    {
      img: 'stack', alt: 'A compact stacked list of TV shows, each with who recommended it',
      title: 'Later, when you need something',
      body: 'Looking for a book for the beach or a show for tonight? Filter by books, movies, TV, restaurants and more, or by who recommended it. It also checks where a show streams and whether your library has the book.'
    },
    {
      img: 'watching', alt: 'The Watching tab listing shows with the next episode for each, like S2 E4, and how many are left',
      title: 'Keep your place in shows',
      body: 'The Watching tab remembers which episode you\'re on and tells you when a new one comes out. It\'s private unless you choose to share it.'
    }
  ];

  const reasons = [
    ['You\'ve asked "what was that show you told me about?"', 'and neither of you could remember.'],
    ['You have a list in your Notes app', 'that you never actually look at.'],
    ['You trust some friends\' taste more than others', 'so knowing who said it matters.'],
    ['You use Libby or a bunch of streaming apps', 'and want to know where something is before you go looking.'],
    ['It\'s not just shows', 'books, movies, podcasts, restaurants, recipes and places to go all fit.']
  ];

  const faq = [
    ['Does it cost anything?', 'No. No ads, nothing to buy.'],
    ['Who can see what I add?', "Only people who were invited. It isn't public, and nothing you add goes anywhere else. What you're watching stays private unless you turn on sharing."],
    ['What does Google sign-in do?', "It just proves it's you. The site gets your name and email address, nothing else, and never posts anything."],
    ['Do I need to download an app?', "No. It's a website. You can add it to your phone's home screen and it opens like an app."],
    ['Do I have to add things?', "No. You can just browse what friends recommend. When you do tell someone about something good, putting it here takes a few seconds."]
  ];
</script>

<section class="wel" aria-labelledby="how-h">
  <h2 id="how-h">Here's how it works</h2>
  <ol class="steps">
    {#each steps as s, i}
      <li class="step" class:flip={i % 2 === 1}>
        <figure class="phone"><img src="/tour/{s.img}.webp" alt={s.alt} width="600" height="1200" loading={i ? 'lazy' : 'eager'} /></figure>
        <div class="txt">
          <h3>{s.title}</h3>
          <p>{s.body}</p>
        </div>
      </li>
    {/each}
  </ol>

  <h2>You'll probably like it if…</h2>
  <ul class="reasons">
    {#each reasons as [a, b]}<li><b>{a}</b> {b}</li>{/each}
  </ul>

  <h2>Good to know</h2>
  <dl class="faq">
    {#each faq as [q, a]}<div><dt>{q}</dt><dd>{a}</dd></div>{/each}
  </dl>
  <p class="demo-note">Screenshots are from a sample board with made-up people.</p>
</section>

<style>
  .wel { margin-top: 34px; display: grid; gap: 14px; }
  h2 { margin: 18px 0 2px; font-size: 24px; line-height: 1.15; font-weight: 800; letter-spacing: -.02em; }
  h2:first-child { margin-top: 0; }
  .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 30px; }
  .step { display: grid; grid-template-columns: 150px 1fr; gap: 18px; align-items: center; }
  .step.flip { grid-template-columns: 1fr 150px; }
  .step.flip .phone { order: 2; }
  .phone { margin: 0; border-radius: 26px; overflow: hidden; border: 5px solid var(--ink); background: var(--surface); box-shadow: 0 12px 30px rgba(0, 0, 0, .14); aspect-ratio: 1 / 2; }
  .phone img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }
  .txt h3 { margin: 0 0 6px; font-size: 18px; line-height: 1.25; font-weight: 800; }
  .txt p { margin: 0; color: var(--ink-2); line-height: 1.5; font-size: 15.5px; }
  @media (max-width: 380px) {
    .step, .step.flip { grid-template-columns: 1fr; }
    .step.flip .phone { order: 0; }
    .phone { width: 62%; justify-self: center; }
  }
  .reasons { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .reasons li { background: var(--surface); border-radius: 14px; padding: 12px 14px 12px 40px; position: relative; line-height: 1.45; color: var(--ink-2); }
  .reasons li::before { content: ''; position: absolute; left: 15px; top: 17px; width: 12px; height: 12px; border-radius: 50%; background: #0D9488; }
  .reasons li:nth-child(5n+2)::before { background: #2563EB; }
  .reasons li:nth-child(5n+3)::before { background: #DC2626; }
  .reasons li:nth-child(5n+4)::before { background: #EA580C; }
  .reasons li:nth-child(5n+5)::before { background: #7C3AED; }
  .reasons b { color: var(--ink); }
  .faq { margin: 0; display: grid; gap: 14px; }
  .faq dt { font-weight: 800; }
  .faq dd { margin: 3px 0 0; color: var(--ink-2); line-height: 1.5; }
  .demo-note { margin: 4px 0 0; color: var(--ink-2); font-size: 13px; }
</style>
