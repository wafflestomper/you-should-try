import { tmdb } from './tmdb.js';
// Searching for things to add to a list.
// Books and audiobooks: Open Library (free, no key). Movies and TV: TMDB (free key, set as TMDB_KEY).
// Restaurants and recipes are added by hand for now.

const UA = 'YouShouldTry/0.2 (github.com/wafflestomper/you-should-try)';

const TMDB_GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama',
  10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 53: 'Thriller', 10752: 'War', 37: 'Western', 10759: 'Action & Adventure', 10762: 'Kids',
  10765: 'Sci-Fi & Fantasy', 10768: 'War & Politics'
};

async function searchLocal(db, kind, q) {
  const rows = (await db.prepare(
    `SELECT id, kind, title, creator, year, narrator, image_url, source, source_id FROM items
      WHERE kind = ? AND (title LIKE ? OR creator LIKE ?) ORDER BY title LIMIT 6`)
    .bind(kind, `%${q}%`, `%${q}%`).all()).results;
  const labels = await itemLabels(db, rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, local_id: r.id, labels: labels[r.id] || [] }));
}

/** Outside labels saved for items, keyed by item id. */
export async function itemLabels(db, ids) {
  if (!ids.length) return {};
  const rows = (await db.prepare(`SELECT item_id, label FROM item_tags WHERE item_id IN (${ids.map(() => '?').join(',')})`)
    .bind(...ids).all()).results;
  const out = {};
  for (const r of rows) (out[r.item_id] ||= []).push(r.label);
  return out;
}

async function searchOpenLibrary(kind, q) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year,cover_i,subject&limit=8`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.docs || []).map((d) => ({
    kind,
    title: d.title,
    creator: (d.author_name || []).slice(0, 2).join(', '),
    year: d.first_publish_year ?? null,
    image_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
    source: kind === 'audiobook' ? 'openlibrary-audio' : 'openlibrary',
    source_id: d.key,
    labels: (d.subject || []).slice(0, 25)
  }));
}

async function searchTmdb(kind, q, key, year = null) {
  const type = kind === 'tv' ? 'tv' : 'movie';
  const params = { query: q, include_adult: 'false' };
  if (year) params[type === 'tv' ? 'first_air_date_year' : 'primary_release_year'] = String(year);
  const data = await tmdb(`/search/${type}`, params, key);
  return (data.results || []).slice(0, 8).map((m) => {
    const date = m.release_date || m.first_air_date || '';
    return {
      kind,
      title: m.title || m.name,
      creator: kind === 'tv' ? 'TV series' : 'Movie',
      year: date ? Number(date.slice(0, 4)) : null,
      image_url: m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : null,
      source: 'tmdb-' + type,
      source_id: String(m.id),
      labels: (m.genre_ids || []).map((g) => TMDB_GENRES[g]).filter(Boolean)
    };
  });
}

/** "The Crash 2026" or "The Crash (2026)" → { title: 'The Crash', year: 2026 }. Leaves titles that are only a year (1917) alone. */
export function splitYear(q) {
  const m = String(q).trim().match(/^(.*?)[\s,(\[]+((?:19[2-9]|20[0-3])\d)[)\]]?\s*$/);
  return m && m[1].trim().length >= 2 ? { title: m[1].trim(), year: Number(m[2]) } : { title: String(q).trim(), year: null };
}

const norm = (t) => String(t || '').toLowerCase().replace(/^(the|a|an)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();

export async function search(db, env, kind, q, { year: wantYear = null } = {}) {
  q = q.trim();
  // A year typed after the title narrows the search ("The Crash 2026")
  const sy = splitYear(q);
  const year = wantYear || sy.year;
  const plain = sy.year ? sy.title : q;
  if (q.length < 2) return { results: [], note: null };
  const local = await searchLocal(db, kind, plain);
  let outside = [];
  let note = null;
  try {
    if (kind === 'book' || kind === 'audiobook') {
      outside = await searchOpenLibrary(kind, plain);
      if (year) outside = outside.map((r, i) => ({ r, i })).sort((a, b) => (b.r.year === year) - (a.r.year === year) || a.i - b.i).map((x) => x.r);
    }
    else if (kind === 'movie' || kind === 'tv') {
      if (env.TMDB_KEY) {
        // Search the type they picked and the other one too: a documentary film is easy to file as a TV show
        const other = kind === 'tv' ? 'movie' : 'tv';
        const runs = await Promise.all([
          searchTmdb(kind, plain, env.TMDB_KEY, year),
          year ? searchTmdb(kind, plain, env.TMDB_KEY) : [],
          searchTmdb(other, plain, env.TMDB_KEY, year).catch(() => []),
          sy.year ? searchTmdb(kind, q, env.TMDB_KEY).catch(() => []) : []
        ]);
        const seen = new Set();
        outside = runs.flat().filter((r) => { const k = `${r.source}|${r.source_id}`; if (seen.has(k)) return false; seen.add(k); return true; });
        // Best first: exact title, the year asked for, then the type they picked
        const want = norm(plain);
        // With no year typed, recent titles get a small nudge: friends mostly recommend new things
        const recent = new Date().getFullYear() - 2;
        const score = (r) => (norm(r.title) === want ? 4 : 0) + (year && r.year === year ? 3 : 0) + (!year && r.year >= recent ? 1.5 : 0) + (r.kind === kind ? 1 : 0);
        outside = outside.map((r, i) => ({ r, i })).sort((a, b) => score(b.r) - score(a.r) || a.i - b.i).map((x) => x.r);
      }
      else note = 'Movie and TV search turns on once the TMDB key is added. For now you can add them by hand.';
    }
  } catch (e) {
    note = /401/.test(e.message) ? 'Movie and TV search is set up wrong: TMDB turned the key down. Z needs to check the TMDB_KEY secret.' : 'The outside search did not answer. Try again, or add it by hand.';
  }
  // Drop outside results that are already in our database
  const have = new Set(local.map((l) => `${l.source}|${l.source_id}`));
  const known = outside.length
    ? (await db.prepare(
        `SELECT id, source, source_id FROM items WHERE source_id IN (${outside.map(() => '?').join(',')})`)
        .bind(...outside.map((o) => o.source_id)).all()).results
    : [];
  for (const o of outside) {
    const k = known.find((x) => x.source === o.source && x.source_id === o.source_id);
    if (k) o.local_id = k.id;
  }
  const merged = [...local, ...outside.filter((o) => !have.has(`${o.source}|${o.source_id}`) && !(o.local_id && local.some((l) => l.local_id === o.local_id)))];
  return { results: merged.slice(0, 10), note };
}
