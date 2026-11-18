// Streaming and library availability for one item. The item page asks for this after it has opened,
// so slow outside services never hold up the page itself.
import { json, error } from '@sveltejs/kit';
import { myLibraries } from '$lib/server/libs.js';
import { streaming, library, libbySearchUrl } from '$lib/server/where.js';

export async function GET({ params, platform, locals }) {
  if (!locals.user) error(401, 'Sign in first.');
  const db = platform.env.DB, env = platform.env;
  const item = await db.prepare('SELECT * FROM items WHERE id = ?').bind(params.id).first();
  if (!item) error(404, 'Not found');
  try {
    if (['movie', 'tv'].includes(item.kind)) return json({ stream: await streaming(db, env, item) });
    if (['book', 'audiobook'].includes(item.kind)) {
      const rows = await library(db, env, item, await myLibraries(db, locals.user.id));
      return json({ libs: rows.map((r) => ({ ...r, search: libbySearchUrl(r.lib.key, item) })) });
    }
  } catch (e) {
    console.error(JSON.stringify({ where: 'api/where', item: params.id, message: e?.message }));
    return json({ failed: true });
  }
  return json(null);
}
