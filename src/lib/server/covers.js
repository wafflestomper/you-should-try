import { tmdb } from './tmdb.js';
// Fill in missing covers and posters for things on the board (demo items, typed-in titles).
const UA = 'YouShouldTry/1.0 (friends recommendation board)';
const RETRY_DAYS = 7;

async function bookCover(it) {
  const q = new URLSearchParams({ title: it.title, fields: 'cover_i,title', limit: '3' });
  if (it.creator) q.set('author', it.creator.split(',')[0]);
  const r = await fetch(`https://openlibrary.org/search.json?${q}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const d = await r.json();
  const hit = (d.docs || []).find((x) => x.cover_i);
  return hit ? `https://covers.openlibrary.org/b/id/${hit.cover_i}-M.jpg` : null;
}

async function poster(it, key) {
  if (!key) return null;
  const type = it.kind === 'tv' ? 'tv' : 'movie';
  const params = { query: it.title };
  if (it.year) params[type === 'tv' ? 'first_air_date_year' : 'year'] = String(it.year);
  const d = await tmdb(`/search/${type}`, params, key, 6000);
  const hit = (d.results || []).find((x) => x.poster_path);
  return hit ? `https://image.tmdb.org/t/p/w185${hit.poster_path}` : null;
}

/** Look up a few missing covers. Runs after the page is sent, so it never slows anything down. */
export async function fillCovers(db, env, max = 8) {
  const cutoff = Date.now() - RETRY_DAYS * 864e5;
  const items = (await db.prepare(
    `SELECT DISTINCT i.id, i.kind, i.title, i.creator, i.year FROM items i JOIN recs r ON r.item_id = i.id
     WHERE i.image_url IS NULL AND i.kind IN ('book','audiobook','movie','tv')
       AND (i.cover_checked_at IS NULL OR i.cover_checked_at < ?) LIMIT ?`).bind(cutoff, max).all()).results;
  await Promise.all(items.map(async (it) => {
    let url = null;
    try { url = ['book', 'audiobook'].includes(it.kind) ? await bookCover(it) : await poster(it, env.TMDB_KEY); } catch {}
    await db.prepare('UPDATE items SET image_url = COALESCE(?, image_url), cover_checked_at = ? WHERE id = ?').bind(url, Date.now(), it.id).run();
  }));
  return items.length;
}
