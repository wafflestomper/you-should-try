import { json, error } from '@sveltejs/kit';
import { MOODS } from '$lib/facetTags.js';

// Anyone can fix an item's moods. Once fixed by a person, the AI leaves them alone.
export async function POST({ params, request, platform, locals }) {
  if (!locals.user) error(401);
  const { moods } = await request.json().catch(() => ({}));
  if (!Array.isArray(moods)) error(400);
  const db = platform.env.DB;
  const item = await db.prepare('SELECT id FROM items WHERE id = ?').bind(params.id).first();
  if (!item) error(404);
  const keep = [...new Set(moods.map(String))].filter((m) => MOODS.includes(m)).slice(0, 4);
  await db.batch([
    db.prepare("DELETE FROM item_facets WHERE item_id = ? AND type = 'mood'").bind(item.id),
    ...keep.map((m) => db.prepare("INSERT INTO item_facets (item_id, type, tag, source) VALUES (?, 'mood', ?, 'user')").bind(item.id, m)),
    db.prepare('UPDATE items SET moods_by_user = 1 WHERE id = ?').bind(item.id)
  ]);
  return json({ moods: keep });
}
