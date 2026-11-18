// TV show facts for episode tracking, from TMDB, saved in tv_meta / tv_season.
// Pages read only the saved copy; fresh copies are fetched in the background or on request.
import { tmdb } from './tmdb.js';
import { tmdbRef, budget } from './where.js';
import { standing } from '$lib/tvmath.js';

const META_HOURS = 8;
const SEASON_HOURS = 24;

const tvId = async (db, env, item, b) => {
  const ref = await tmdbRef(db, item, env.TMDB_KEY, b);
  return ref && ref.startsWith('tv:') ? ref.slice(3) : null;
};

/** Saved show facts for several items at once (database only, fast). */
export async function savedInfo(db, ids) {
  if (!ids.length) return {};
  const rows = (await db.prepare(`SELECT item_id, data, fetched_at FROM tv_meta WHERE item_id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results;
  return Object.fromEntries(rows.map((r) => [r.item_id, { ...JSON.parse(r.data), fetched_at: r.fetched_at }]));
}

// Local testing only (TV_DEMO=1): made-up seasons so the screens can be tried without TMDB
function demoInfo(item) {
  let h = 0; for (const c of item.title) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const n = 2 + (h % 3), seasons = Array.from({ length: n }, (_, i) => ({ n: i + 1, count: 6 + ((h >> (i * 3)) % 5), air: `${2019 + i}-01-10` }));
  const lastS = seasons[n - 1], ongoing = h % 2 === 0;
  const inWeek = new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10);
  return { seasons, last: { s: lastS.n, e: ongoing ? lastS.count - 2 : lastS.count, air: '2026-11-11' },
    next: ongoing ? { s: lastS.n, e: lastS.count - 1, air: inWeek } : null, ended: !ongoing, status: ongoing ? 'Returning Series' : 'Ended' };
}

/** Show facts, fetching from TMDB if the saved copy is missing or old. */
export async function showInfo(db, env, item, { force = false, b = budget(4) } = {}) {
  if (env.TV_DEMO === '1') {
    const info = demoInfo(item);
    await db.prepare(`INSERT INTO tv_meta (item_id, data, fetched_at) VALUES (?, ?, ?) ON CONFLICT (item_id) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`).bind(item.id, JSON.stringify(info), Date.now()).run();
    return info;
  }
  const row = await db.prepare('SELECT data, fetched_at FROM tv_meta WHERE item_id = ?').bind(item.id).first();
  if (row && !force && Date.now() - row.fetched_at < META_HOURS * 3600e3) return JSON.parse(row.data);
  if (!env.TMDB_KEY) return row ? JSON.parse(row.data) : null;
  try {
    const id = await tvId(db, env, item, b);
    if (!id) return row ? JSON.parse(row.data) : null;
    const d = await tmdb(`/tv/${id}`, {}, env.TMDB_KEY, 6000);
    const ep = (x) => (x ? { s: x.season_number, e: x.episode_number, air: x.air_date || null, name: x.name || null } : null);
    const info = {
      seasons: (d.seasons || []).map((x) => ({ n: x.season_number, count: x.episode_count || 0, air: x.air_date || null })),
      last: ep(d.last_episode_to_air),
      next: ep(d.next_episode_to_air),
      ended: ['Ended', 'Canceled'].includes(d.status),
      status: d.status || null
    };
    await db.prepare(`INSERT INTO tv_meta (item_id, data, fetched_at) VALUES (?, ?, ?)
      ON CONFLICT (item_id) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`).bind(item.id, JSON.stringify(info), Date.now()).run();
    return info;
  } catch {
    return row ? JSON.parse(row.data) : null;
  }
}

/** Episode names and air dates for one season. */
export async function seasonEpisodes(db, env, item, n) {
  if (env.TV_DEMO === '1') {
    const words = ['Pilot', 'The Long Night', 'Crossroads', 'Second Chances', 'Homecoming', 'The Reckoning', 'Lost and Found', 'Tipping Point', 'Endgame', 'Aftermath', 'New Blood'];
    const info = demoInfo(item), x = info.seasons.find((y) => y.n === n);
    const eps = Array.from({ length: x?.count ?? 0 }, (_, i) => ({ e: i + 1, name: words[(i + n) % words.length], air: i + 1 > (info.last.s === n ? info.last.e : 99) ? info.next?.air ?? null : `${2018 + n}-0${1 + (i % 9)}-15` }));
    await db.prepare(`INSERT INTO tv_season (item_id, season, data, fetched_at) VALUES (?, ?, ?, ?) ON CONFLICT (item_id, season) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`).bind(item.id, n, JSON.stringify(eps), Date.now()).run();
    return eps;
  }
  const row = await db.prepare('SELECT data, fetched_at FROM tv_season WHERE item_id = ? AND season = ?').bind(item.id, n).first();
  if (row && Date.now() - row.fetched_at < SEASON_HOURS * 3600e3) return JSON.parse(row.data);
  try {
    const id = await tvId(db, env, item, budget(2));
    if (!id) return row ? JSON.parse(row.data) : [];
    const d = await tmdb(`/tv/${id}/season/${n}`, {}, env.TMDB_KEY, 6000);
    const eps = (d.episodes || []).map((x) => ({ e: x.episode_number, name: x.name || null, air: x.air_date || null, mins: x.runtime || null }));
    await db.prepare(`INSERT INTO tv_season (item_id, season, data, fetched_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (item_id, season) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`).bind(item.id, n, JSON.stringify(eps), Date.now()).run();
    return eps;
  } catch {
    return row ? JSON.parse(row.data) : [];
  }
}

/** Save someone's place in a show. Works out whether they're caught up from the saved show facts. */
export async function setProgress(db, me, itemId, s, e, info) {
  const st = info ? standing(info, s, e) : null;
  const caught = st && st.state !== 'next';
  await db.prepare(
    `INSERT INTO tv_progress (user_id, item_id, season, episode, status, caught_up_at, updated_at) VALUES (?, ?, ?, ?, 'watching', ?, datetime('now'))
     ON CONFLICT (user_id, item_id) DO UPDATE SET season = excluded.season, episode = excluded.episode, status = 'watching',
       caught_up_at = excluded.caught_up_at, updated_at = excluded.updated_at`)
    .bind(me, itemId, s, e, caught ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null).run();
  return st;
}

/** Refresh old show facts for someone's tracked shows (run in the background). */
export async function refreshTracked(db, env, me, max = 6) {
  if (!env.TMDB_KEY) return;
  const stale = (await db.prepare(
    `SELECT i.* FROM tv_progress p JOIN items i ON i.id = p.item_id LEFT JOIN tv_meta m ON m.item_id = p.item_id
      WHERE p.user_id = ? AND p.status = 'watching' AND (m.fetched_at IS NULL OR m.fetched_at < ?) LIMIT ?`)
    .bind(me, Date.now() - META_HOURS * 3600e3, max).all()).results;
  const b = budget(12);
  await Promise.all(stale.map((it) => showInfo(db, env, it, { force: true, b }).catch(() => {})));
  // Episode names for whatever's up next, so the Watching tab can say "S2 E5, Crossroads"
  const need = (await db.prepare(
    `SELECT i.*, p.season AS ps FROM tv_progress p JOIN items i ON i.id = p.item_id
      WHERE p.user_id = ? AND p.status = 'watching'
        AND NOT EXISTS (SELECT 1 FROM tv_season t WHERE t.item_id = p.item_id AND t.season = p.season) LIMIT 4`).bind(me).all()).results;
  await Promise.all(need.map((it) => seasonEpisodes(db, env, it, it.ps).catch(() => {})));
}
