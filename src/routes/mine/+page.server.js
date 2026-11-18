import { fail } from '@sveltejs/kit';
import { getBoard, react } from '$lib/server/board.js';

export async function load({ platform, locals, url }) {
  const view = url.searchParams.get('v') === 'hidden' ? 'hidden' : 'done';
  const db = platform.env.DB;
  const [cards, counts] = await Promise.all([
    getBoard(db, locals.user.id, { view, sort: 'new' }),
    db.prepare('SELECT state, COUNT(*) AS n FROM reactions WHERE user_id = ? GROUP BY state').bind(locals.user.id).all()
  ]);
  return { cards, view, counts: Object.fromEntries(counts.results.map((r) => [r.state, r.n])) };
}

export const actions = {
  react: async ({ request, platform, locals }) => {
    const f = await request.formData();
    try { await react(platform.env.DB, locals.user.id, String(f.get('item')), String(f.get('state')), f.get('reaction') ? String(f.get('reaction')) : null); }
    catch (e) { return fail(400, { error: e.message }); }
  }
};
