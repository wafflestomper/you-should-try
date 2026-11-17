import { getTryList } from '$lib/server/data.js';
import { removeFromTry } from '$lib/server/actions.js';
import { myLibraries, libraryActions } from '$lib/server/libs.js';
import { streaming, library, bestLine, budget } from '$lib/server/where.js';

export async function load({ platform, locals }) {
  const db = platform.env.DB;
  const env = platform.env;
  const [items, libs] = await Promise.all([getTryList(db, locals.user.id), myLibraries(db, locals.user.id)]);

  // Where to get each one. Not awaited, so the list shows right away and these fill in.
  const where = (async () => {
    const b = budget(40);
    const lines = {};
    await Promise.all(items.map(async (t) => {
      const it = { ...t, id: t.item_id };
      let w = null;
      if (['movie', 'tv'].includes(t.kind)) w = { stream: await streaming(db, env, it, b) };
      else if (['book', 'audiobook'].includes(t.kind) && libs.length) w = { libs: await library(db, it, libs, b) };
      const line = bestLine(it, w);
      if (line) lines[t.item_id] = line;
    }));
    return lines;
  })();

  return { items, libs, where, hasTmdb: !!env.TMDB_KEY };
}

export const actions = {
  remove: async ({ request, platform, locals }) => {
    const f = await request.formData();
    await removeFromTry(platform.env.DB, locals.user, String(f.get('item')));
  },
  ...libraryActions
};
