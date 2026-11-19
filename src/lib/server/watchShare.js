// Who else is watching a show, from people who share (never when they watched: only where they are).
import { shortNames } from './board.js';
import { standing } from '$lib/tvmath.js';

export async function alsoWatching(db, me, itemId, info) {
  const [rows, shorts] = await Promise.all([
    db.prepare(
      `SELECT p.user_id, p.season AS s, p.episode AS e, p.status, u.name FROM tv_progress p JOIN users u ON u.id = p.user_id
        WHERE p.item_id = ? AND p.user_id != ? AND u.share_watching = 1 AND u.status = 'active' AND p.private = 0 AND p.status IN ('watching', 'done')`)
      .bind(itemId, me).all(),
    shortNames(db)
  ]);
  return rows.results.map((r) => {
    const st = info && r.status === 'watching' ? standing(info, r.s, r.e) : null;
    const finished = r.status === 'done' || st?.state === 'finished';
    return { id: r.user_id, name: shorts[`u:${r.user_id}`] ?? r.name.split(' ')[0], s: r.s, e: r.e, finished, caughtUp: st?.state === 'waiting' };
  }).sort((a, b) => (a.finished - b.finished) || (b.s - a.s) || (b.e - a.e));
}

/** One person's shared shows, for their page. */
export async function theirShows(db, userId) {
  const rows = (await db.prepare(
    `SELECT p.item_id, p.season AS s, p.episode AS e, p.status, i.title, i.image_url, m.data AS info FROM tv_progress p
       JOIN users u ON u.id = p.user_id JOIN items i ON i.id = p.item_id LEFT JOIN tv_meta m ON m.item_id = p.item_id
      WHERE p.user_id = ? AND u.share_watching = 1 AND p.private = 0 AND p.status IN ('watching', 'done') ORDER BY p.updated_at DESC LIMIT 40`).bind(userId).all()).results;
  return rows.map((r) => {
    const info = r.info ? JSON.parse(r.info) : null;
    const st = info && r.status === 'watching' ? standing(info, r.s, r.e) : null;
    return { id: r.item_id, title: r.title, image: r.image_url, s: r.s, e: r.e, finished: r.status === 'done' || st?.state === 'finished', caughtUp: st?.state === 'waiting' };
  });
}
