import { json } from '@sveltejs/kit';
import { searchLibraries } from '$lib/server/where.js';

export async function GET({ url }) {
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return json({ libraries: [] });
  try {
    return json({ libraries: await searchLibraries(q) });
  } catch {
    return json({ libraries: [], note: 'Library search is not responding right now. Try again in a minute.' });
  }
}
