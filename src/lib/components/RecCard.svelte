<script>
  // One recommendation. Two looks (set on the page wrapper): .look-light (editorial, cover pops out)
  // and .look-dark (blurred cover behind frosted glass). In Stack view it starts collapsed.
  import { enhance } from '$app/forms';
  import Cover from './Cover.svelte';
  import { KIND as KI, kindColor, kindDeep } from '$lib/kinds.js';
  import { invalidateAll } from '$app/navigation';
  import { showToast, postAction } from '$lib/toast.svelte.js';
  let { card, action = '?/react', stacked = false, swipe = false, fresh = false } = $props();

  // Swipe left to reveal Delete (things I entered) or Not for me (everyone else's)
  const ACT = 92;
  let dx = $state(0), dragging = $state(false);
  let sx = 0, sy = 0, base = 0, axis = null, pid = null, moved = false;
  let canDelete = $derived(card.iAdded || card.private);
  // On the board, Delete and Not for me take the card away instantly; the save happens behind it
  let gone = $state(false);
  function deleteNow() {
    gone = true; dx = 0;
    let undoData = null;
    const title = it.title;
    showToast(`Deleted ${title}.`, async () => {
      gone = false;
      showToast(`Put back ${title}.`);
      const data = await waiting;
      if (data) { await postAction('undoRemove', { undo: data }); await invalidateAll(); }
    });
    let done; const waiting = new Promise((r) => (done = r));
    return async ({ result, update }) => {
      if (result.type === 'success') { done(result.data?.undo ?? null); await update({ reset: false }); }
      else { done(null); gone = false; showToast(`Couldn't delete ${title}. Try again.`); }
    };
  }
  function hideNow() {
    if (!swipe) return async ({ update }) => update();
    gone = true; dx = 0;
    const title = it.title, item = it.id, before = mine?.state ?? 'clear';
    showToast(`${title} is off your board.`, async () => {
      gone = false;
      showToast(`Put back ${title}.`);
      await postAction('react', { item, state: before === 'hidden' ? 'clear' : before });
      await invalidateAll();
    });
    return async ({ result, update }) => {
      if (result.type === 'success') await update({ reset: false });
      else { gone = false; showToast(`Couldn't change ${title}. Try again.`); }
    };
  }
  function down(e) {
    if (!swipe || e.button > 0) return;
    sx = e.clientX; sy = e.clientY; base = dx; axis = null; pid = e.pointerId; moved = false;
  }
  function move(e) {
    if (pid !== e.pointerId) return;
    const mx = e.clientX - sx, my = e.clientY - sy;
    if (!axis && Math.hypot(mx, my) > 8) axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    if (axis !== 'x') return;
    if (!dragging) { dragging = true; e.currentTarget.setPointerCapture?.(e.pointerId); }
    moved = true;
    dx = Math.max(-ACT - 30, Math.min(0, base + mx));
  }
  function up(e) {
    if (pid !== e.pointerId) return;
    pid = null;
    if (dragging) { dragging = false; dx = dx < -ACT / 2 ? -ACT : 0; if (dx) window.dispatchEvent(new CustomEvent('yst-swipe', { detail: it.id })); }
  }
  // While open, a tap on the card closes it instead of opening the card
  function clickCapture(e) {
    if (moved || dx) { e.preventDefault(); e.stopPropagation(); if (!moved) dx = 0; moved = false; }
  }
  $effect(() => {
    if (!swipe) return;
    const other = (e) => { if (e.detail !== it.id) dx = 0; };
    window.addEventListener('yst-swipe', other);
    return () => window.removeEventListener('yst-swipe', other);
  });

  const DONE = { book: 'Read it', audiobook: 'Listened', movie: 'Watched it', tv: 'Watched it', podcast: 'Listened', restaurant: 'Been there', recipe: 'Made it', place: 'Been there', other: 'Tried it' };
  const first = (n) => n.split(' ')[0];
  function ago(iso) {
    const d = (Date.now() - Date.parse(iso.replace(' ', 'T') + 'Z')) / 864e5;
    if (d < 1) return 'today'; if (d < 2) return 'yesterday'; if (d < 7) return `${Math.floor(d)} days ago`;
    if (d < 30) return `${Math.floor(d / 7)} wk ago`; return `${Math.floor(d / 30)} mo ago`;
  }
  let rating = $state(false);
  let open = $state(false);
  let it = $derived(card.item);
  let mine = $derived(card.mine);
  let names = $derived([...new Set(card.recs.map((r) => r.by_name))]);
  let whoLine = $derived(card.private ? 'Just for you' : names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(' and '));
  // Who entered it, when that's not the recommender ("Warren · via Amy"). Only on the open card; the recommender is what matters.
  let vias = $derived([...new Set(card.recs.map((r) => r.via).filter(Boolean))]);
  let viaLine = $derived(vias.length === 1 ? `via ${vias[0]}` : vias.length > 1 ? `via ${vias.slice(0, 2).join(' and ')}` : '');
  let shareStep = $state(null); // 'loved' | 'liked' while asking whether to recommend a private pick
  // Clearing a private pick would make it vanish, so it goes back to "just for me" instead
  let backTo = $derived(card.private ? 'wanted' : 'clear');
  let collapsed = $derived(stacked && !open);
  const firstNote = $derived(card.recs.find((r) => r.note));
</script>

<div class="rcw" class:collapsed class:gone data-id={card.item.id}><div class="swbox">
{#if swipe}
  <div class="swact" class:del={canDelete} aria-hidden={dx === 0}>
    {#if canDelete}
      <form method="POST" action="?/removeMine" use:enhance={deleteNow}>
        <input type="hidden" name="item" value={it.id} />
        <button tabindex={dx ? 0 : -1} aria-label="Delete {it.title}">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Delete</span>
        </button>
      </form>
    {:else}
      <form method="POST" {action} use:enhance={hideNow}>
        <input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value="hidden" />
        <button tabindex={dx ? 0 : -1} aria-label="Not for me: {it.title}">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 6.1A9.9 9.9 0 0 1 12 6c5 0 9 4.5 10 6-.5.8-1.6 2.2-3.2 3.5M6.3 7.6C4.4 8.9 2.9 10.7 2 12c1 1.5 5 6 10 6 1.5 0 2.9-.4 4.1-1M9.9 10a3 3 0 0 0 4.1 4.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Not for me</span>
        </button>
      </form>
    {/if}
  </div>
{/if}
<article class="rc" class:starred={mine?.state === 'starred'} class:collapsed class:stacked class:swipe class:dragging
  style="--kc:{kindColor(it.kind)};--kd:{kindDeep(it.kind)};{dx ? `transform:translateX(${dx}px)` : ''}"
  onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onclickcapture={clickCapture} ondragstart={(e) => { if (swipe) e.preventDefault(); }}>
  {#if collapsed}
    <button class="strip" onclick={() => (open = true)} aria-expanded="false" aria-label="{it.title}, {KI[it.kind]?.label}. Open">
      <span class="st-txt"><span class="k">{KI[it.kind]?.label ?? it.kind}{#if card.fresh}<em class="new" class:out={!fresh}>New</em>{/if}</span><span class="st-title" class:long={it.title.length > 28}>{it.title}</span><span class="st-who">{whoLine}</span>{#if firstNote}<span class="st-note">“{firstNote.note}” <b>{firstNote.by_name}</b></span>{/if}</span>
      {#if mine?.state === 'wanted'}<span class="star-dot qm" aria-label="Just for you">?</span>{/if}
      {#if mine?.state === 'starred'}<span class="star-dot" aria-label="Starred"><svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8Z"/></svg></span>{/if}
      <span class="st-cov"><Cover title={it.title} kind={it.kind} image={it.image_url} w={42} /></span>
    </button>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="hero" class:tap={stacked} onclick={(e) => { if (stacked && !e.target.closest('a, button')) open = false; }}>
      <div class="blur" aria-hidden="true">{#if it.image_url}<img src={it.image_url} alt="" loading="lazy" />{/if}</div>
      <a href="/item/{it.id}" class="cov" tabindex="-1" aria-hidden="true"><Cover title={it.title} kind={it.kind} image={it.image_url} w={96} /></a>
      <div class="ht">
        <span class="kline"><span class="k"><i aria-hidden="true"></i>{KI[it.kind]?.label ?? it.kind}</span>{#if card.fresh}<em class="new" class:out={!fresh}>New</em>{/if}</span>
        <h3 class:long={it.title.length > 32}><a href="/item/{it.id}">{it.title}</a></h3>
        {#if it.creator}<div class="sub">{it.creator}</div>{/if}
      </div>
      {#if mine?.state === 'wanted'}<span class="starbadge qm" title="Just for you" aria-label="Just for you">?</span>{/if}
      {#if mine?.state === 'starred'}<span class="starbadge" title="Starred" aria-label="Starred"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8Z"/></svg></span>{/if}
      {#if stacked}<button class="close" onclick={() => (open = false)} aria-label="Close {it.title}"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>{/if}
    </div>

    {#if card.recs.some((r) => r.note) || card.loved.length || card.liked.length}
      <div class="tip" aria-hidden="true">
        {#each card.recs.filter((r) => r.note).slice(0, 3) as r}<p class="tq">“{r.note}”<span>{r.by_name}</span></p>{/each}
        {#if card.loved.length || card.liked.length}<p class="tl">♥ {[...card.loved, ...card.liked].join(', ')}</p>{/if}
      </div>
    {/if}
    <div class="body">
      {#each card.recs.filter((r) => r.note) as r}<p class="q">“{r.note}” <span class="qby">{r.by_name}</span></p>{/each}
      {#if it.kind === 'recipe'}
        <p class="rlink">{#if it.url}<a href={it.url} target="_blank" rel="noopener">Open the recipe ↗</a>{:else if it.has_details}<a href="/item/{it.id}#details">See the recipe</a>{:else}<a href="/item/{it.id}#details">+ Add the recipe</a>{/if}</p>
      {/if}
      <div class="meta">
        <span><b>{whoLine}</b>{card.private ? ', nobody else sees it yet' : ''}{viaLine ? ` · ${viaLine}` : ''} · {ago(card.newest)}{#if card.boosted}<span class="match" title="People with taste like yours are behind this one">your kind of thing</span>{/if}</span>
        {#if card.loved.length || card.liked.length}
          <span class="lv"><svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.4 4.5 6.1 4.5c2.2 0 3.6 1.2 4.4 2.4h3c.8-1.2 2.2-2.4 4.4-2.4 3.7 0 5.7 3.9 4.1 7.2C19.5 16.4 12 21 12 21Z"/></svg>{[...card.loved, ...card.liked].join(', ')}</span>
        {/if}
      </div>

      <div class="acts">
        {#if mine?.state === 'done'}
          <span class="state">{mine.reaction === 'loved' ? 'You loved it' : mine.reaction === 'liked' ? 'You liked it' : "You didn't like it"}</span>
          <form method="POST" {action} use:enhance><input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value={backTo} /><button class="g">Undo</button></form>
        {:else if mine?.state === 'hidden'}
          <span class="state">Marked not for you</span>
          <form method="POST" {action} use:enhance><input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value={backTo} /><button class="g">Put it back</button></form>
        {:else if shareStep}
          <span class="state">Put it on the board for everyone?</span>
          <div class="rate">
            <form method="POST" {action} use:enhance={() => async ({ update }) => { shareStep = null; rating = false; await update(); }}>
              <input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value="done" /><input type="hidden" name="reaction" value={shareStep} /><input type="hidden" name="share" value="1" />
              <button class="p sm">Yes, recommend it</button>
            </form>
            <form method="POST" {action} use:enhance={() => async ({ update }) => { shareStep = null; rating = false; await update(); }}>
              <input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value="done" /><input type="hidden" name="reaction" value={shareStep} />
              <button class="g">No, just mark it done</button>
            </form>
          </div>
        {:else if rating}
          <span class="state">How was it?</span>
          <div class="rate">
            {#each [['loved', 'Loved it'], ['liked', 'Liked it'], ['not_for_me', "Didn't like it"]] as [r, label]}
              {#if card.private && r !== 'not_for_me'}
                <button class="p sm" onclick={() => (shareStep = r)}>{label}</button>
              {:else}
                <form method="POST" {action} use:enhance={() => async ({ update }) => { rating = false; await update(); }}>
                  <input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value="done" /><input type="hidden" name="reaction" value={r} />
                  <button class="p sm">{label}</button>
                </form>
              {/if}
            {/each}
            <button class="g" onclick={() => (rating = false)}>Cancel</button>
          </div>
        {:else}
          <button class="p" onclick={() => (rating = true)}>{DONE[it.kind] ?? 'Tried it'}</button>
          <form method="POST" {action} use:enhance>
            <input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value={mine?.state === 'starred' ? backTo : 'starred'} />
            <button class="s" aria-pressed={mine?.state === 'starred'} aria-label={mine?.state === 'starred' ? 'Unstar' : 'Star it to keep it at the top of your board'}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill={mine?.state === 'starred' ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8Z"/></svg></button>
          </form>
          <form method="POST" {action} use:enhance={hideNow}><input type="hidden" name="item" value={it.id} /><input type="hidden" name="state" value="hidden" /><button class="g" title="Takes it off your board. Everyone else still sees it.">Not for me</button></form>
        {/if}
      </div>
    </div>
  {/if}
</article>
</div></div>

<style>
  .rc { position: relative; border-radius: 22px; isolation: isolate; }
  .tip, .st-note { display: none; }
  .swbox { position: relative; }
  .rcw.gone { display: none; }
  .rc.swipe :global(img), .rc.swipe a { -webkit-user-drag: none; user-select: none; -webkit-touch-callout: none; }
  .rc.swipe { touch-action: pan-y; transition: transform .22s ease; z-index: 1; }
  .rc.swipe.dragging { transition: none; }
  .swact { position: absolute; inset: 0; border-radius: 22px; display: flex; justify-content: flex-end; background: #57534E; overflow: hidden; }
  .swact.del { background: #D92D20; }
  .collapsed .swact { border-radius: 20px; }
  .swact form { margin: 0; display: flex; }
  .swact button { width: 92px; border: 0; background: none; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font: 800 13px Manrope, sans-serif; cursor: pointer; }
  .rc :global(.cover-img), .rc :global(.cover) { border-radius: 8px; box-shadow: 0 10px 22px rgba(0,0,0,.28); }
  .rc :global(.cover-img.round), .rc :global(.cover.restaurant), .rc :global(.cover.recipe) { border-radius: 50%; }
  .cov { text-decoration: none; }
  .hero.tap { cursor: pointer; }
  .k { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
  .k i { width: 9px; height: 9px; border-radius: 3px; background: var(--kc); }
  h3 { margin: 4px 0 2px; line-height: 1.02; overflow-wrap: anywhere; }
  h3 a { color: inherit; text-decoration: none; }
  .sub { font-size: 13px; font-weight: 600; }
  .q { margin: 0 0 6px; }
  .qby { font-size: 12.5px; font-weight: 700; font-style: normal; font-family: Manrope, sans-serif; opacity: .65; white-space: nowrap; }
  .meta { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; font-size: 12.5px; font-weight: 600; }
  .rt { margin-left: 6px; font-weight: 800; color: #C99A06; white-space: nowrap; }
  .lv { display: inline-flex; align-items: center; gap: 4px; }
  .match { margin-left: 6px; font-size: 11.5px; font-weight: 800; border-radius: 10px; padding: 1px 8px; white-space: nowrap; }
  .rlink { margin: 4px 0 6px; font-weight: 700; font-size: 14px; }
  .acts { display: flex; gap: 8px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
  .acts form { margin: 0; }
  .rate { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .p, .s, .g { min-height: 42px; border-radius: 12px; font: 800 14px Manrope, system-ui, sans-serif; border: 0; padding: 0 16px; cursor: pointer; }
  .p { flex: 1; }
  .p.sm { flex: none; min-height: 38px; padding: 0 12px; font-size: 13.5px; }
  .acts > .p { flex: 1; }
  .s { width: 44px; padding: 0; display: grid; place-items: center; }
  .g { background: none; padding: 0 6px; }
  .state { font-weight: 800; font-size: 14px; }
  .starbadge { position: absolute; top: 12px; right: 12px; z-index: 3; width: 32px; height: 32px; border-radius: 50%; background: #F5C518; color: #fff; display: grid; place-items: center; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
  .starbadge.qm, .star-dot.qm { background: #2563EB; color: #fff; font: 800 17px Manrope, sans-serif; }
  .star-dot.qm { font-size: 14px; }
  .kline { display: flex; align-items: center; gap: 8px; }
  .new { font-style: normal; display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 999px; background: #E11D48; color: #fff;
    font: 800 11px Manrope, sans-serif; letter-spacing: .04em; text-transform: none; vertical-align: 1px; transition: opacity .8s ease, transform .8s ease; }
  .kline .new { margin-left: 0; }
  .new.out { opacity: 0; transform: scale(.85); }
  @media (prefers-reduced-motion: reduce) { .new { transition: opacity .3s; } .new.out { transform: none; } }
  .close { position: absolute; top: 10px; left: 10px; z-index: 3; width: 36px; height: 36px; border-radius: 50%; border: 0; display: grid; place-items: center; cursor: pointer; }

  /* ---------- Stack (wallet) ---------- */
  .collapsed { border-radius: 20px; }
  .strip { box-sizing: border-box; width: 100%; display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px 30px; border: 0; border-radius: 20px; text-align: left; cursor: pointer; color: #fff; font: inherit;
    background: linear-gradient(150deg, var(--kc), var(--kd)); box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 -6px 18px rgba(0,0,0,.16); }
  .st-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .strip .k { opacity: .85; }
  .st-title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; font-size: 20px; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; }
  .st-title.long { font-size: 17px; }
  .st-who { font-size: 12.5px; font-weight: 600; opacity: .85; }
  .st-cov { flex: none; transform: rotate(4deg); }
  .star-dot { width: 24px; height: 24px; border-radius: 50%; background: #F5C518; color: #fff; display: grid; place-items: center; flex: none; }

  /* ---------- Look: light / editorial ---------- */
  :global(.look-light) .rc:not(.collapsed) { background: color-mix(in srgb, var(--kc) 9%, #E9E9E4); padding: 16px 16px 14px; margin-top: 30px; }
  :global(.look-light) .stacked:not(.collapsed) { margin-top: 30px; }
  :global(.look-light) .hero { position: relative; min-height: 104px; padding-right: 116px; }
  :global(.look-light) .blur { display: none; }
  :global(.look-light) .cov { position: absolute; top: -46px; right: 0; transform: rotate(3deg); z-index: 2; }
  :global(.look-light) .k { color: var(--kd); }
  :global(.look-light) h3.long { font-size: 28px !important; }
  :global(.look-light) h3 { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 36px; letter-spacing: -.01em; color: #111113; }
  :global(.look-light) .sub { color: #6B6B73; }
  :global(.look-light) .q { font-family: "Instrument Serif", Georgia, serif; font-style: italic; font-size: 20px; line-height: 1.28; color: #111113; margin-top: 8px; }
  :global(.look-light) .meta { color: #6B6B73; }
  :global(.look-light) .meta b { color: #111113; }
  :global(.look-light) .lv { color: #D21F52; }
  :global(.look-light) .match { background: #E8F1EC; color: #1F5D45; }
  :global(.look-light) .rlink a { color: var(--kd); }
  :global(.look-light) .p { background: var(--kd); color: #fff; }
  :global(.look-light) .s { background: rgba(255,255,255,.75); color: #111113; }
  :global(.look-light) .s[aria-pressed='true'] { color: #C99A06; }
  :global(.look-light) .g { color: #6B6B73; }
  :global(.look-light) .state { color: #111113; }
  :global(.look-light) .close { background: #fff; color: #111113; }
  :global(.look-light) .stacked .close { top: -4px; left: auto; right: 124px; }
  :global(.look-light) .starbadge { top: -30px; right: auto; left: -2px; }
  :global(.look-light) .stacked .starbadge { top: -30px; left: -2px; right: auto; }
  /* Light stack: same calm tinted card as the full cards, not the bold gradient */
  :global(.look-light) .strip { background: color-mix(in srgb, var(--kc) 9%, #E9E9E4); color: #111113;
    box-shadow: 0 -1px 0 rgba(255,255,255,.9) inset, 0 -8px 18px rgba(17,17,19,.08); border: 1px solid color-mix(in srgb, var(--kc) 14%, #DCDCD6); padding-top: 13px; }
  :global(.look-light) .strip .k { color: var(--kd); opacity: 1; }
  :global(.look-light) .strip .k::before { content: ''; width: 9px; height: 9px; border-radius: 3px; background: var(--kc); }
  :global(.look-light) .st-title { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 25px; letter-spacing: -.005em; line-height: 1.05; }
  :global(.look-light) .st-title.long { font-size: 21px; }
  :global(.look-light) .st-who { color: #6B6B73; opacity: 1; }

  /* ---------- Look: dark / blurred cover ---------- */
  :global(.look-dark) .rc:not(.collapsed) { background: #141417; overflow: hidden; color: #fff; box-shadow: inset 0 0 0 2px var(--kc), 0 0 22px color-mix(in srgb, var(--kc) 35%, transparent); }
  :global(.look-dark) .blur { position: absolute; inset: -40px; z-index: -1;
    background: radial-gradient(circle at 25% 30%, var(--kd), transparent 60%), radial-gradient(circle at 85% 15%, var(--kc), transparent 55%); filter: blur(26px); opacity: .95; }
  :global(.look-dark) .blur img { width: 100%; height: 100%; object-fit: cover; filter: blur(30px) saturate(1.4); opacity: .75; transform: scale(1.3); }
  :global(.look-dark) .hero { position: relative; display: flex; gap: 14px; align-items: flex-end; padding: 18px 16px 10px; }
  :global(.look-dark) .ht { flex: 1; min-width: 0; padding-right: 26px; }
  :global(.look-dark) .hero .k { background: var(--kc); color: #fff; padding: 3px 9px; border-radius: 8px; opacity: 1; }
  :global(.look-dark) .hero .k i { display: none; }
  .strip .k { align-self: flex-start; }
  :global(.look-dark) h3.long { font-size: 21px; }
  :global(.look-dark) h3 { font-size: 26px; font-weight: 800; letter-spacing: -.03em; }
  :global(.look-dark) .sub { opacity: .75; }
  :global(.look-dark) .body { margin: 6px 8px 8px; padding: 12px; border-radius: 18px; background: rgba(255,255,255,.1); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.12); }
  :global(.look-dark) .q { font-size: 15px; line-height: 1.4; font-weight: 600; }
  :global(.look-dark) .meta { opacity: .85; }
  :global(.look-dark) .lv { color: #FF8FAB; }
  :global(.look-dark) .match { background: rgba(255,255,255,.18); color: #fff; }
  :global(.look-dark) .rlink a { color: #fff; }
  :global(.look-dark) .p { background: #fff; color: #0C0C0E; }
  :global(.look-dark) .s { background: rgba(255,255,255,.14); color: #fff; }
  :global(.look-dark) .s[aria-pressed='true'] { color: #F5C518; }
  :global(.look-dark) .g { color: rgba(255,255,255,.75); }
  :global(.look-dark) .close { background: rgba(0,0,0,.35); color: #fff; }
  /* Dark covers disappear on a dark page: give every cover a white sticker edge */
  :global(.look-dark) .rc :global(.cover-img), :global(.look-dark) .rc :global(.cover) { outline: 3px solid #fff; outline-offset: -1px; }
  :global(.look-dark) .stacked .ht { padding-left: 0; }
  :global(.look-dark) .stacked .hero { padding-top: 54px; }
</style>
