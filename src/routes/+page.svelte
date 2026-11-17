<script>
  import { page } from '$app/state';
  import Nav from '$lib/components/Nav.svelte';
  import Corners from '$lib/components/Corners.svelte';
  import Ribbon from '$lib/components/Ribbon.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Cover from '$lib/components/Cover.svelte';
  let { data } = $props();
  const KIND = { book: 'Book', audiobook: 'Audiobook', movie: 'Movie', tv: 'TV', restaurant: 'Restaurant', recipe: 'Recipe' };
  const first = (n) => (n || '').split(' ')[0];
  const label = (e) => (e.dish ? `${e.dish[0].toUpperCase()}${e.dish.slice(1)}, ${e.title}` : e.title);
  const ago = (ts) => {
    const d = (Date.now() - new Date(ts.replace(' ', 'T') + 'Z').getTime()) / 60000;
    if (d < 60) return `${Math.max(1, Math.round(d))} minutes ago`;
    if (d < 1440) return `${Math.round(d / 60)} hours ago`;
    return d < 2880 ? 'Yesterday' : `${Math.round(d / 1440)} days ago`;
  };
</script>

<div class="frame"><div class="board big"><Corners size={80} />
  <div class="inner">
    <Nav path="/" user={page.data.user} counts={page.data.counts} showLogo={false} />
    <div class="head">
      <div class="title"><div class="script you">You should</div><Ribbon w={280} h={64} size={32} /></div>
      <div class="tonight"><div class="script" style="font-size:40px">• Tonight •</div><div class="cap" style="font-size:12.5px;color:var(--chalk-2)">Three lists on the board</div></div>
      <div class="badge"><span class="slab" style="font-size:40px;line-height:1">{data.categories.reduce((s, c) => s + c.n, 0)}</span><span class="script" style="font-size:20px">lists</span></div>
    </div>
    <div class="lists">
      {#each data.board as l}
        <a class="bcol" href="/list/{l.id}">
          <div class="slab ltitle">{l.title}</div>
          <div class="cap who">{first(l.owner_name)}'s {l.subtitle.replace('Top 10 ', '').toLowerCase()}</div>
          {#each l.top as e, i}
            <div class="brow"><span>{label(e)}</span><span class="slab no">{e.position}</span></div>
            {#if i === 0 && e.why}<div class="script note">{e.why}</div>{/if}
          {/each}
        </a>
      {/each}
    </div>
  </div>
</div></div>

<div class="cols" style="margin-top:40px">
  <section class="main-col">
    <h2 class="h2">For you</h2><div class="sub">Your picks, your people, and things sent your way</div><div class="rule"></div>
    {#each data.feed as n}
      <div class="feed">
        <Avatar name={n.actor_name} color={n.actor_color} />
        <div style="flex:1;min-width:0">
          <p>
            {#if n.type === 'saved_your_pick'}<b>{first(n.actor_name)}</b> saved <a href="/item/{n.item_id}"><b>{n.item_title}</b></a> from your {n.list_title}. It's on their try list now.
            {:else if n.type === 'tried_your_pick'}<b>{first(n.actor_name)}</b> tried your pick <a href="/item/{n.item_id}"><b>{n.item_title}</b></a> and ranked it <b>No. {n.data.rank}</b>.
            {:else if n.type === 'sent_you'}<b>{first(n.actor_name)}</b> says you should try <a href="/item/{n.item_id}"><b>{n.item_title}</b></a>.{#if n.rec_note} <span class="serif" style="font-style:italic">“{n.rec_note}”</span>{/if}
            {:else if n.type === 'new_list'}<b>{first(n.actor_name)}</b> started a new list, <a href="/list/{n.list_id}"><b>{n.list_title}</b></a>.
            {/if}
          </p>
          <div class="when">{ago(n.created_at)}</div>
        </div>
      </div>
    {:else}
      <p class="muted">Nothing yet. When friends save your picks or send you something, it shows up here.</p>
    {/each}
  </section>

  <section style="flex:1 1 280px;min-width:0">
    <h2 class="h2">Same taste as you</h2><div class="sub">Ranked by how your top 10s overlap</div><div class="rule"></div>
    {#each data.twins as t}
      <a class="twin" href="/people/{t.id}"><Avatar name={t.name} color={t.color} /><span style="flex:1">{t.name}</span><span class="slab" style="font-size:22px">{t.pct}%</span></a>
    {:else}
      <p class="muted small">Rank a few more things and your closest matches show up here.</p>
    {/each}
    {#if data.different}
      <h2 class="h2" style="margin-top:34px">Something different</h2><div class="sub">From someone who rarely agrees with you</div><div class="rule"></div>
      <a class="diff" href="/item/{data.different.item.id}">
        <Cover title={data.different.item.title} kind={data.different.item.kind} w={64} />
        <div><div class="kind">{KIND[data.different.item.kind]}</div><div style="font-weight:700;font-size:16px">{data.different.item.title}</div>
          <div class="small muted">{first(data.different.person.name)}'s No. {data.different.rank}. You two match {data.different.person.pct}%.</div></div>
      </a>
    {/if}
  </section>

  <aside class="side-col">
    <div class="ticket">
      <h3>Your order</h3>
      <div class="tsub">Your try list · {data.tryList.length} items</div>
      {#each data.tryList.slice(0, 5) as t}
        <a class="tl" href="/item/{t.item_id}">
          <div class="kind">{KIND[t.kind]}</div>
          <div style="font-weight:700;font-size:15.5px">{t.dish ? `${t.dish[0].toUpperCase()}${t.dish.slice(1)}, ${t.title}` : t.title}</div>
          {#if t.from_name}<div class="small faint">{first(t.from_name)}'s No. {t.from_rank}</div>{/if}
        </a>
      {/each}
      <a href="/try" class="btn sm" style="width:100%;margin-top:14px">See your whole try list</a>
    </div>
  </aside>
</div>

<section style="margin-top:50px">
  <h2 class="h2">The full menu</h2><div class="sub">Main top tens. Pick one to see the group's favorites.</div><div class="rule"></div>
  <div class="menu serif">
    {#each data.categories as c}<a href="/category/{c.id}">{c.name} <span>{c.n}</span></a>{/each}
  </div>
</section>

<style>
  .big { padding: 18px 30px 22px; }
  .inner { position: relative; padding: 4px 40px 0; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-top: 18px; }
  .you { font-size: 64px; line-height: .9; transform: rotate(-5deg); transform-origin: left; margin-left: 6px; }
  .tonight { text-align: center; }
  .badge { width: 124px; height: 124px; border-radius: 50%; border: 2.4px solid var(--chalk); outline: 1.6px dashed var(--chalk); outline-offset: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .lists { display: flex; flex-wrap: wrap; margin-top: 18px; border-top: 1px solid rgba(241,240,234,.5); }
  .bcol { flex: 1 1 260px; min-width: 0; padding: 16px 24px 4px; border-left: 3px dotted rgba(241,240,234,.6); text-decoration: none; }
  .bcol:first-child { border-left: 0; padding-left: 0; }
  .bcol:hover .ltitle { text-decoration: underline; }
  .ltitle { font-size: 30px; line-height: 1.05; }
  .who { font-size: 12.5px; color: var(--chalk-2); margin: 8px 0; }
  .brow { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font: 600 18px var(--caps); }
  .no { font-size: 22px; }
  .note { font-size: 20px; color: #CFD1CA; margin: -2px 0 4px; }
  .feed { display: flex; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--line); }
  .feed p { margin: 0; font-size: 15.5px; line-height: 1.45; }
  .when { font-size: 12.5px; color: var(--ink-3); margin-top: 3px; }
  .twin { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); text-decoration: none; color: var(--ink); }
  .diff { display: flex; gap: 14px; align-items: flex-start; text-decoration: none; color: var(--ink); }
  .tsub { text-align: center; font-size: 12.5px; color: var(--ink-3); border-bottom: 1px dashed var(--dots); padding: 4px 0 10px; }
  .tl { display: block; padding: 10px 0; border-bottom: 1px dashed #D9D5C7; text-decoration: none; color: var(--ink); }
  .menu { display: flex; flex-wrap: wrap; gap: 8px 22px; }
  .menu a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--dots); font-size: 16px; }
  .menu span { font: 12.5px var(--body); color: var(--ink-3); }
  @media (max-width: 640px) {
    .big { padding: 12px 14px 14px; }
    .inner { padding: 0; }
    .you { font-size: 40px; }
    .tonight, .badge { display: none; }
    .ltitle { font-size: 24px; }
    .bcol { padding: 14px 0 4px; border-left: 0; border-top: 3px dotted rgba(241,240,234,.5); flex-basis: 100%; }
    .bcol:first-child { border-top: 0; }
  }
</style>
