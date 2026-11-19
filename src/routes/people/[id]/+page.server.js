// One person's page: what they recommend, and (if they share) what they're watching.
import { error } from '@sveltejs/kit';
import { theirShows } from '$lib/server/watchShare.js';
import { shortNames } from '$lib/server/board.js';

export async function load({ params, platform, locals }) {
  const db = platform.env.DB;
  const u = await db.prepare("SELECT id, name, how_known, share_watching FROM users WHERE id = ? AND status = 'active'").bind(params.id).first();
  if (!u) error(404, "That person isn't on here.");
  const [picks, shows, shorts] = await Promise.all([
    db.prepare(`SELECT i.id, i.title, i.kind, i.image_url, r.note, r.created_at FROM recs r JOIN items i ON i.id = r.item_id
                 WHERE r.by_user_id = ? ORDER BY r.created_at DESC LIMIT 60`).bind(u.id).all(),
    theirShows(db, u.id),
    shortNames(db)
  ]);
  return {
    person: { id: u.id, name: u.name, short: shorts[`u:${u.id}`] ?? u.name, how: u.how_known, sharing: !!u.share_watching, isMe: u.id === locals.user.id },
    picks: picks.results, shows
  };
}
