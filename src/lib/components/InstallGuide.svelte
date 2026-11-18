<script>
  import { install } from '$lib/install.svelte.js';
  let { info } = $props();

  const SHARE = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const DOTS = '<b>⋮</b>';
  const GUIDES = {
    'ios-safari': { title: 'iPhone, in Safari', steps: [
      `Tap the <b>Share</b> button ${SHARE}. It's at the bottom of the screen (on some newer iPhones, tap <b>•••</b> first, then Share).`,
      'Tap <b>View More</b> to open the full list.',
      'Scroll down and tap <b>Add to Home Screen</b>.',
      'Tap <b>Add</b> in the top right corner.' ] },
    'ios-chrome': { title: 'iPhone, in Chrome', steps: [
      `Tap the <b>Share</b> button ${SHARE} at the top right, next to the address.`,
      'Tap <b>View More</b> to open the full list.',
      'Scroll down and tap <b>Add to Home Screen</b>.',
      'Tap <b>Add</b>.' ] },
    'ios-other': { title: 'iPhone, other browsers', steps: [
      'Open this site in <b>Safari</b>. That\'s the most reliable on iPhone.',
      'Then follow the Safari steps.' ] },
    'android-chrome': { title: 'Android, in Chrome', steps: [
      `Tap the ${DOTS} menu at the top right.`,
      'Tap <b>Add to Home screen</b> (it may say <b>Install app</b>).',
      'Tap <b>Install</b> or <b>Add</b>.' ] },
    'android-samsung': { title: 'Android, in Samsung Internet', steps: [
      'Tap the <b>☰</b> menu at the bottom right.',
      'Tap <b>Add page to</b>, then <b>Home screen</b>.',
      'Tap <b>Add</b>.' ] },
    'android-other': { title: 'Android, other browsers', steps: [
      'Open this site in <b>Chrome</b>.', 'Then follow the Chrome steps.' ] },
    desktop: { title: 'On a computer', steps: [
      'This works best on your phone: open the site there and come back to this page.',
      'In Chrome or Edge on a computer you can also install it: look for the install icon at the right end of the address bar.' ] }
  };
  const keyFor = (i) => GUIDES[i.key] ? i.key : i.platform === 'ios' ? 'ios-other' : i.platform === 'android' ? 'android-other' : 'desktop';
  let mine = $derived(info ? keyFor(info) : 'ios-safari');
  let showAll = $state(false);
  const order = ['ios-safari', 'ios-chrome', 'android-chrome', 'android-samsung', 'desktop'];

  async function installNow() {
    if (!install.prompt) return;
    install.prompt.prompt();
    await install.prompt.userChoice.catch(() => {});
    install.prompt = null; install.ready = false;
  }
</script>

{#if info?.standalone}
  <p class="done">You're already using it from your home screen. Nice.</p>
{:else}
  {#if install.ready}
    <button class="btn dark big" onclick={installNow}>Add it to my home screen</button>
    <p class="hint">One tap on this phone. Or follow the steps below.</p>
  {/if}
  <section class="guide">
    <h2>{GUIDES[mine].title}</h2>
    <ol>{#each GUIDES[mine].steps as s}<li>{@html s}</li>{/each}</ol>
    {#if info?.platform === 'ios'}<p class="hint">The first time you open it from the home screen, sign in with Google once more. iPhone keeps home screen apps signed in separately from the browser.</p>{/if}
  </section>
  <button class="lnk" onclick={() => (showAll = !showAll)} aria-expanded={showAll}>{showAll ? 'Hide other phones' : 'On a different phone or browser?'}</button>
  {#if showAll}
    {#each order.filter((k) => k !== mine) as k}
      <section class="guide other"><h2>{GUIDES[k].title}</h2><ol>{#each GUIDES[k].steps as s}<li>{@html s}</li>{/each}</ol></section>
    {/each}
  {/if}
{/if}

<style>
  .guide { background: var(--surface); border-radius: 18px; padding: 16px 18px; margin: 10px 0; }
  .guide.other { opacity: .9; }
  h2 { margin: 0 0 8px; font-size: 18px; font-weight: 800; }
  ol { margin: 0; padding-left: 22px; display: grid; gap: 10px; font-size: 16px; line-height: 1.45; }
  .hint { color: var(--ink-2); font-size: 13.5px; margin: 8px 0 0; }
  .lnk { background: none; border: 0; padding: 10px 0; font: 700 14.5px Manrope, sans-serif; color: var(--ink); text-decoration: underline; cursor: pointer; }
  .big { min-height: 52px; width: 100%; font-size: 17px; margin-top: 6px; }
  .done { font-weight: 700; background: var(--surface); border-radius: 14px; padding: 14px; }
</style>
