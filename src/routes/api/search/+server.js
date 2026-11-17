import { json } from '@sveltejs/kit';
import { search } from '$lib/server/search.js';

export async function GET({ url, platform, locals }) {
  if (!locals.user) return json({ results: [] }, { status: 401 });
  const kind = url.searchParams.get('kind') || 'book';
  const q = url.searchParams.get('q') || '';
  return json(await search(platform.env.DB, platform.env, kind, q));
}
