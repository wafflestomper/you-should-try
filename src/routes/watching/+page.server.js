// Your Watching tab: shows you're keeping your place in. Reads only saved data, so it opens instantly;
// old show facts are refreshed in the background for next time.
import { refreshTracked } from '$lib/server/tv.js';

export async function load({ platform, locals }) {
  const db = platform.env.DB, me = locals.user.id;
  const [rows, names] = await db.batch([
    db.prepare(
      `SELECT p.item_id, p.season AS s, p.episode AS e, p.caught_up_at, p.updated_at, i.title, i.year, i.image_url, m.data AS info,
              EXISTS (SELECT 1 FROM recs r WHERE r.item_id = p.item_id) AS on_board
         FROM tv_progress p JOIN items i ON i.id = p.item_id LEFT JOIN tv_meta m ON m.item_id = p.item_id
        WHERE p.user_id = ? AND p.status = 'watching' ORDER BY p.updated_at DESC`).bind(me),
    db.prepare(
      `SELECT t.item_id, t.season, t.data FROM tv_season t JOIN tv_progress p ON p.item_id = t.item_id AND p.user_id = ? AND p.status = 'watching'
        WHERE t.season BETWEEN p.season AND p.season + 1`).bind(me)
  ]);
  // Episode names we already have, for "Up next: S2 E5, Crossroads"
  const epNames = {};
  for (const r of names.results) for (const x of JSON.parse(r.data)) if (x.name) epNames[`${r.item_id}:${r.season}:${x.e}`] = x.name;
  const shows = rows.results.map((r) => ({ id: r.item_id, title: r.title, year: r.year, image: r.image_url, s: r.s, e: r.e, caughtUp: !!r.caught_up_at, onBoard: !!r.on_board, at: r.updated_at, info: r.info ? JSON.parse(r.info) : null }));
  const job = refreshTracked(db, platform.env, me).catch(() => {});
  if (platform.context?.waitUntil) platform.context.waitUntil(job); else if (platform.ctx?.waitUntil) platform.ctx.waitUntil(job);
  const meRow = await db.prepare('SELECT share_watching FROM users WHERE id = ?').bind(me).first();
  return { shows, epNames, sharing: !!meRow?.share_watching };
}
