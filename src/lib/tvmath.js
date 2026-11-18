// Episode arithmetic shared by the server and the page. A show's info looks like:
// { seasons: [{ n, count, air }], last: { s, e, air } | null, next: { s, e, air } | null, ended }
// Progress is the last episode watched: { s, e } (s 1, e 0 = not started).

const real = (info) => (info?.seasons || []).filter((x) => x.n >= 1 && x.count > 0).sort((a, b) => a.n - b.n);

/** The episode after the one given, or null at the end of what's announced. */
export function nextAfter(info, s, e) {
  const seasons = real(info);
  if (!seasons.length) return null;
  const cur = seasons.find((x) => x.n === s);
  if (cur && e < cur.count) return { s, e: e + 1 };
  const later = seasons.find((x) => x.n > s);
  if (later) return { s: later.n, e: 1 };
  if (!cur && s < seasons[0].n) return { s: seasons[0].n, e: 1 };
  return null;
}

/** Has this episode come out yet? */
export function aired(info, ep) {
  const l = info?.last;
  if (!l || !ep) return false;
  return ep.s < l.s || (ep.s === l.s && ep.e <= l.e);
}

/** How many episodes are out that you haven't watched. */
export function leftToWatch(info, s, e) {
  const l = info?.last;
  if (!l) return 0;
  let n = 0;
  for (const x of real(info)) {
    if (x.n < s || x.n > l.s) continue;
    const from = x.n === s ? e + 1 : 1;
    const to = x.n === l.s ? Math.min(l.e, x.count) : x.count;
    if (to >= from) n += to - from + 1;
  }
  return n;
}

/** Where someone stands: 'next' (something to watch), 'waiting' (caught up, more coming), 'finished'. */
export function standing(info, s, e) {
  const nx = nextAfter(info, s, e);
  if (nx && aired(info, nx)) return { state: 'next', ep: nx, left: leftToWatch(info, s, e) };
  if (!info?.ended) {
    const soon = info?.next && nx && info.next.s === nx.s && info.next.e === nx.e ? info.next.air : null;
    return { state: 'waiting', ep: nx, air: soon ?? info?.next?.air ?? null, left: 0 };
  }
  return { state: 'finished', ep: null, left: 0 };
}

/** The episode just before this one (for un-checking). */
export function prevOf(info, s, e) {
  if (e > 1) return { s, e: e - 1 };
  const before = real(info).filter((x) => x.n < s).pop();
  return before ? { s: before.n, e: before.count } : { s: real(info)[0]?.n ?? 1, e: 0 };
}

export const epCode = (ep) => (ep ? `S${ep.s} E${ep.e}` : '');
