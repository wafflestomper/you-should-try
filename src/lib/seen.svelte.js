// "New" on the board. Which cards were new when you arrived stays pinned to the top
// for this visit, so nothing jumps while you're looking. Reopening the app reshuffles.
import { SvelteSet } from 'svelte/reactivity';

export const seen = { pinned: null, at: 0, local: new SvelteSet() };
const HOLD = 20 * 60 * 1000; // a visit: 20 minutes

export function pinFresh(cards) {
  // On the server this module is shared by everyone's requests: never remember anything there
  if (typeof window === 'undefined') return cards.filter((c) => c.fresh).map((c) => c.item.id);
  if (seen.pinned && Date.now() - seen.at < HOLD) return seen.pinned;
  seen.pinned = cards.filter((c) => c.fresh).map((c) => c.item.id);
  seen.at = Date.now();
  return seen.pinned;
}

let queue = new Set(), timer = null;
export function markSeen(id) {
  if (seen.local.has(id)) return;
  seen.local.add(id);
  queue.add(id);
  clearTimeout(timer);
  timer = setTimeout(flush, 600);
}
function flush() {
  if (!queue.size) return;
  const ids = [...queue]; queue = new Set();
  fetch('/api/seen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }), keepalive: true }).catch(() => {});
}
if (typeof window !== 'undefined') addEventListener('pagehide', flush);
