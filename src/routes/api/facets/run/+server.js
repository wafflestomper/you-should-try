import { json, error } from '@sveltejs/kit';
import { facetSome } from '$lib/server/facets.js';

// Admin "Tag everything now": does a few per call; the page keeps calling until nothing is left
export async function POST({ platform, locals, url }) {
  if (!locals.realUser?.is_admin) error(403);
  const db = platform.env.DB;
  if (url.searchParams.get('redo') === '1') await db.prepare('UPDATE items SET facets_at = NULL').run();
  const left = await facetSome(db, platform.env, 4);
  const done = await db.prepare('SELECT COUNT(*) AS n FROM items WHERE facets_at IS NOT NULL AND id IN (SELECT item_id FROM recs UNION SELECT item_id FROM reactions)').first();
  return json({ left, done: done.n });
}
