// Start tracking a show picked from search (it doesn't have to be on the board).
import { json, error } from '@sveltejs/kit';
import { ensureItem } from '$lib/server/lists.js';
import { showInfo } from '$lib/server/tv.js';

export async function POST({ platform, locals, request }) {
  if (!locals.user) error(401, 'Sign in first.');
  const db = platform.env.DB;
  const b = await request.json().catch(() => ({}));
  if (!b.title) error(400, 'Pick a show.');
  const id = await ensureItem(db, { kind: 'tv', title: b.title, year: b.year, image_url: b.image_url, source: b.source, source_id: b.source_id, local_id: b.local_id, creator: 'TV series' });
  const item = await db.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
  const info = await showInfo(db, platform.env, item);
  return json({ id, title: item.title, info });
}
