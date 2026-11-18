import { fail } from '@sveltejs/kit';
import { getBoard, react } from '$lib/server/board.js';

export async function load({ platform, locals, url }) {
  const v = url.searchParams.get('v');
  const view = v === 'hidden' || v === 'picks' ? v : 'done';
  const db = platform.env.DB;
  const [cards, counts] = await Promise.all([
    getBoard(db, locals.user.id, { view, sort: 'new' }),
    db.prepare('SELECT state, COUNT(*) AS n FROM reactions WHERE user_id = ? GROUP BY state').bind(locals.user.id).all()
  ]);
  const picks = (await db.prepare('SELECT COUNT(DISTINCT item_id) AS n FROM recs WHERE by_user_id = ?').bind(locals.user.id).first()).n;
  return { cards, view, myName: locals.user.name, counts: { ...Object.fromEntries(counts.results.map((r) => [r.state, r.n])), picks } };
}

export const actions = {
  react: async ({ request, platform, locals }) => {
    const f = await request.formData();
    try { await react(platform.env.DB, locals.user.id, String(f.get('item')), String(f.get('state')), f.get('reaction') ? String(f.get('reaction')) : null, f.get('share') === '1'); }
    catch (e) { return fail(400, { error: e.message }); }
  }
};
