import { json } from '@sveltejs/kit';
import { searchLibraries } from '$lib/server/where.js';

export async function GET({ url, platform }) {
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return json({ libraries: [] });
  try {
    return json({ libraries: await searchLibraries(platform.env, q) });
  } catch (e) {
    return json({ libraries: [], note: `Library search isn't responding (${e.message}). You can paste your Libby library link instead.` });
  }
}
