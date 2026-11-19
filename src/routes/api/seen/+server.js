import { json, error } from '@sveltejs/kit';

// The board marks cards seen once they've been on screen for a moment
export async function POST({ request, platform, locals }) {
  if (!locals.user) error(401);
  const { ids } = await request.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length) return json({ ok: true });
  const db = platform.env.DB;
  await db.batch(ids.slice(0, 50).map((id) => db.prepare(
    "INSERT INTO board_seen (user_id, item_id, seen_at) SELECT ?1, id, datetime('now') FROM items WHERE id = ?2 ON CONFLICT (user_id, item_id) DO UPDATE SET seen_at = excluded.seen_at").bind(locals.user.id, String(id))));
  return json({ ok: true });
}
