import { fail } from '@sveltejs/kit';
import { getBoard, boardPeople, react, KINDS } from '$lib/server/board.js';

export async function load({ platform, locals, url }) {
  const db = platform.env.DB;
  const q = url.searchParams;
  const opts = {
    kind: KINDS[q.get('kind')] ? q.get('kind') : null,
    person: q.get('person') || null,
    days: Number(q.get('days')) || null,
    sort: ['best', 'new', 'loved'].includes(q.get('sort')) ? q.get('sort') : 'best'
  };
  const [cards, people] = await Promise.all([getBoard(db, locals.user.id, opts), boardPeople(db)]);
  return { cards, people, opts };
}

export const actions = {
  react: async ({ request, platform, locals }) => {
    const f = await request.formData();
    try {
      await react(platform.env.DB, locals.user.id, String(f.get('item')), String(f.get('state')), f.get('reaction') ? String(f.get('reaction')) : null);
    } catch (e) {
      return fail(400, { error: e.message });
    }
  }
};
