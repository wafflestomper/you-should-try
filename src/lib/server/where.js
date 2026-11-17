// Where to get something: streaming for movies and TV (TMDB, data from JustWatch),
// and Libby availability for books and audiobooks (through the Shelf Check worker).
// Results are cached in where_cache so page loads stay quick and the free APIs stay happy.

// Shelf Check's worker. Override with a SHELFCHECK_URL variable in Cloudflare if it ever moves.
const SHELF_DEFAULT = 'https://books.lets-hit.com';
const shelfApi = (env) => (env?.SHELFCHECK_URL || SHELF_DEFAULT).replace(/\/+$/, '');
// Shelf Check's page lives here; sent along in case the worker only answers its own page.
const SHELF_HEADERS = { Origin: 'https://brian.zollinhofer.com', Referer: 'https://brian.zollinhofer.com/shelfcheck/' };
const STREAM_HOURS = 24;
const LIB_HOURS = 12;
const TMDB = 'https://api.themoviedb.org/3';

/** A small budget so one page load never makes too many outside calls (Workers free plan allows 50). */
export function budget(n = 35) {
  let left = n;
  return { take(k = 1) { if (left < k) return false; left -= k; return true; } };
}

async function cached(db, itemId, scope, hours) {
  const row = await db.prepare('SELECT data, fetched_at FROM where_cache WHERE item_id = ? AND scope = ?').bind(itemId, scope).first();
  if (!row) return { fresh: false, data: null };
  return { fresh: Date.now() - row.fetched_at < hours * 3600e3, data: JSON.parse(row.data) };
}
async function store(db, itemId, scope, data) {
  await db.prepare(
    `INSERT INTO where_cache (item_id, scope, data, fetched_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (item_id, scope) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`)
    .bind(itemId, scope, JSON.stringify(data), Date.now()).run();
}

async function getJson(url, opts = {}) {
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${new URL(url).host} answered ${r.status}`);
  const text = await r.text();
  try { return JSON.parse(text); } catch { throw new Error(`${new URL(url).host} sent back something that isn't data`); }
}

/* ---------- Streaming ---------- */

async function tmdbRef(db, item, key, b) {
  if (item.source === 'tmdb-movie') return `movie:${item.source_id}`;
  if (item.source === 'tmdb-tv') return `tv:${item.source_id}`;
  if (item.tmdb_ref != null) return item.tmdb_ref || null;
  if (!b.take()) return undefined;
  const type = item.kind === 'tv' ? 'tv' : 'movie';
  const yearParam = item.year ? `&${type === 'tv' ? 'first_air_date_year' : 'year'}=${item.year}` : '';
  const d = await getJson(`${TMDB}/search/${type}?query=${encodeURIComponent(item.title)}${yearParam}&api_key=${encodeURIComponent(key)}`);
  const ref = d.results?.[0]?.id ? `${type}:${d.results[0].id}` : '';
  await db.prepare('UPDATE items SET tmdb_ref = ? WHERE id = ?').bind(ref, item.id).run();
  return ref || null;
}

const pick = (arr) => (arr || []).map((p) => ({ name: p.provider_name, logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null }));

/**
 * Returns { link, stream:[], free:[], rent:[], buy:[] } for the US, null when TMDB has nothing,
 * or undefined when it couldn't be checked this time.
 */
export async function streaming(db, env, item, b = budget()) {
  if (!['movie', 'tv'].includes(item.kind) || !env.TMDB_KEY) return undefined;
  const c = await cached(db, item.id, 'stream', STREAM_HOURS);
  if (c.fresh) return c.data;
  try {
    const ref = await tmdbRef(db, item, env.TMDB_KEY, b);
    if (ref === undefined) return c.data ?? undefined;
    let data = null;
    if (ref) {
      if (!b.take()) return c.data ?? undefined;
      const [type, id] = ref.split(':');
      const d = await getJson(`${TMDB}/${type}/${id}/watch/providers?api_key=${encodeURIComponent(env.TMDB_KEY)}`);
      const us = d.results?.US;
      if (us) {
        data = {
          link: us.link || null,
          stream: pick(us.flatrate),
          free: [...pick(us.free), ...pick(us.ads)],
          rent: pick(us.rent),
          buy: pick(us.buy)
        };
      }
    }
    await store(db, item.id, 'stream', data);
    return data;
  } catch {
    return c.data ?? undefined;
  }
}

/* ---------- Libby, through Shelf Check ---------- */

export async function searchLibraries(env, q) {
  const d = await getJson(`${shelfApi(env)}/libraries?q=${encodeURIComponent(q)}`, { headers: SHELF_HEADERS });
  return (d.libraries || []).slice(0, 12).map((l) => ({ key: l.key, name: l.name }));
}

/**
 * Libby availability for one book at each of the person's libraries.
 * Returns [{ lib:{key,name}, hits:[{format, available, availableCopies, copies, holds, waitDays, url}] | null }]
 * (hits null means it couldn't be checked this time).
 */
export async function library(db, env, item, libs, b = budget()) {
  if (!['book', 'audiobook'].includes(item.kind) || !libs.length) return [];
  const out = [];
  for (const lib of libs) {
    const scope = `lib:${lib.key}`;
    const c = await cached(db, item.id, scope, LIB_HOURS);
    let hits = c.fresh ? c.data : null;
    if (!c.fresh && b.take()) {
      try {
        const d = await getJson(`${shelfApi(env)}/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...SHELF_HEADERS },
          body: JSON.stringify({ library: lib.key, books: [{ title: item.title, author: item.creator || '' }] })
        });
        const raw = d.results?.[0];
        if (Array.isArray(raw)) {
          hits = raw.map((h) => ({
            format: h.format === 'audio' ? 'audiobook' : 'ebook',
            available: !!h.available,
            availableCopies: h.availableCopies ?? 0,
            copies: h.copies ?? 0,
            holds: h.holds ?? 0,
            waitDays: h.waitDays ?? null,
            kindle: !!h.kindle,
            url: h.id ? `https://${lib.key}.overdrive.com/media/${h.id}` : null
          }));
          await store(db, item.id, scope, hits);
        }
      } catch { /* leave as unknown */ }
    }
    if (hits == null) hits = c.data ?? null;
    if (hits && item.kind === 'audiobook') hits = hits.filter((h) => h.format === 'audiobook');
    out.push({ lib, hits });
  }
  return out;
}

export const libbySearchUrl = (libKey, item) =>
  `https://libbyapp.com/search/${libKey}/search/query-${encodeURIComponent(`${item.title} ${item.creator || ''}`.replace(/\//g, ' ').trim())}/page-1`;

/** One short line for lists: the best way to get it right now. */
export function bestLine(item, where) {
  if (!where) return null;
  if (where.stream) {
    const s = where.stream;
    if (s.stream?.length) return { ok: true, text: `Streaming on ${names(s.stream)}` };
    if (s.free?.length) return { ok: true, text: `Free on ${names(s.free)}` };
    if (s.rent?.length) return { ok: false, text: `Rent on ${names(s.rent)}` };
    if (s.buy?.length) return { ok: false, text: `Buy on ${names(s.buy)}` };
    return null;
  }
  if (where.libs?.length) {
    const all = where.libs.flatMap((l) => (l.hits || []).map((h) => ({ ...h, lib: l.lib })));
    if (!all.length) return where.libs.some((l) => l.hits) ? { ok: false, text: 'Not in your Libby libraries' } : null;
    const now = all.filter((h) => h.available);
    const fmt = (h) => (h.format === 'audiobook' ? 'audiobook' : 'ebook');
    if (now.length) return { ok: true, text: `${cap(fmt(now[0]))} available now at ${short(now[0].lib.name)}` };
    all.sort((a, b) => (a.waitDays ?? 999) - (b.waitDays ?? 999));
    const w = all[0];
    return { ok: false, text: w.waitDays ? `${cap(fmt(w))} hold, about ${Math.max(1, Math.round(w.waitDays / 7))} wk at ${short(w.lib.name)}` : `${cap(fmt(w))} waitlist at ${short(w.lib.name)}` };
  }
  return null;
}
const names = (arr) => { const n = [...new Set(arr.map((p) => p.name))]; return n.length > 2 ? `${n.slice(0, 2).join(', ')} and more` : n.join(' and '); };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const short = (name) => name.replace(/ (County )?(Public )?Library( System)?$/i, '').replace(/^(The )?Free Library of /i, '');
