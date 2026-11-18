import { fail } from '@sveltejs/kit';
import { getBoard, boardPeople, react, KINDS } from '$lib/server/board.js';
import { fillCovers } from '$lib/server/covers.js';

export async function load({ platform, locals, url }) {
  const db = platform.env.DB;
  // Missing covers get looked up in the background; they appear on the next visit.
  const job = fillCovers(db, platform.env).catch(() => {});
  if (platform.context?.waitUntil) platform.context.waitUntil(job); else if (platform.ctx?.waitUntil) platform.ctx.waitUntil(job);
  const q = url.searchParams;
  const opts = {
    kind: KINDS[q.get('kind')] ? q.get('kind') : null,
    person: q.get('person') || null,
    days: Number(q.get('days')) || null,
    sort: ['best', 'new', 'loved'].includes(q.get('sort')) ? q.get('sort') : 'best'
  };
  const [cards, people] = await Promise.all([getBoard(db, locals.user.id, opts), boardPeople(db)]);
  const added = q.get('added') ? await db.prepare('SELECT title FROM items WHERE id = ?').bind(q.get('added')).first() : null;
  // They credited someone who isn't on the site yet: offer to invite them
  const invitee = q.get('guest') ? await db.prepare(
    `SELECT g.id, g.name, (SELECT COUNT(*) FROM invites i WHERE i.guest_id = g.id AND i.used_by IS NULL AND i.expires_at > datetime('now')) AS invited
       FROM guests g WHERE g.id = ? AND g.user_id IS NULL`).bind(q.get('guest')).first() : null;
  return { cards, people, opts, addedTitle: added?.title ?? null, invitee };
}

export const actions = {
  react: async ({ request, platform, locals }) => {
    const f = await request.formData();
    try {
      await react(platform.env.DB, locals.user.id, String(f.get('item')), String(f.get('state')), f.get('reaction') ? String(f.get('reaction')) : null, f.get('share') === '1');
    } catch (e) {
      return fail(400, { error: e.message });
    }
  }
};
