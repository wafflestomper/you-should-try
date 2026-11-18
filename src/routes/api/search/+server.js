import { json } from '@sveltejs/kit';
import { search } from '$lib/server/search.js';
import { onBoard } from '$lib/server/board.js';

export async function GET({ url, platform, locals }) {
  if (!locals.user) return json({ results: [] }, { status: 401 });
  const kind = url.searchParams.get('kind') || 'book';
  const q = url.searchParams.get('q') || '';
  const r = await search(platform.env.DB, platform.env, kind, q);
  const ob = await onBoard(platform.env.DB, r.results.map((m) => m.local_id));
  for (const m of r.results) if (ob[m.local_id]) m.onBoard = ob[m.local_id];
  return json(r);
}
