import { fail } from '@sveltejs/kit';
import { getBoard, boardPeople, react, KINDS } from '$lib/server/board.js';
import { fillCovers } from '$lib/server/covers.js';
import { warmWhere } from '$lib/server/where.js';
import { myLibraries } from '$lib/server/libs.js';

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
  // In the background: look up where to watch or borrow the top few, so opening them is instant
  const warm = myLibraries(db, locals.user.id).then((libs) => warmWhere(db, platform.env, libs, cards.slice(0, 12).map((c) => c.item.id))).catch(() => {});
  if (platform.context?.waitUntil) platform.context.waitUntil(warm); else if (platform.ctx?.waitUntil) platform.ctx.waitUntil(warm);
  const added = q.get('added') ? await db.prepare('SELECT title FROM items WHERE id = ?').bind(q.get('added')).first() : null;
  // They credited someone who isn't on the site yet: offer to invite them
  const invitee = q.get('guest') ? await db.prepare(
    `SELECT g.id, g.name, (SELECT COUNT(*) FROM invites i WHERE i.guest_id = g.id AND i.used_by IS NULL AND i.expires_at > datetime('now')) AS invited
       FROM guests g WHERE g.id = ? AND g.user_id IS NULL`).bind(q.get('guest')).first() : null;
  return { cards, people, opts, addedTitle: added?.title ?? null, invitee };
}

export const actions = {
  // Swipe left > Delete: take back what I entered (added it by mistake), or drop a "just for me" pick
  removeMine: async ({ request, platform, locals }) => {
    const db = platform.env.DB, me = locals.user.id;
    const id = String((await request.formData()).get('item') || '');
    const item = await db.prepare('SELECT title FROM items WHERE id = ?').bind(id).first();
    if (!item) return fail(404, { error: 'That card is gone already.' });
    const recs = (await db.prepare('SELECT id, by_user_id, by_guest_id, note, created_at FROM recs WHERE item_id = ? AND added_by = ?').bind(id, me).all()).results;
    const want = await db.prepare("SELECT 1 FROM reactions WHERE user_id = ? AND item_id = ? AND state = 'wanted'").bind(me, id).first();
    await db.batch([
      db.prepare('DELETE FROM recs WHERE item_id = ? AND added_by = ?').bind(id, me),
      db.prepare("DELETE FROM reactions WHERE user_id = ? AND item_id = ? AND state = 'wanted'").bind(me, id)
    ]);
    return { removed: item.title, undo: JSON.stringify({ item: id, recs, want: !!want }) };
  },
  // Put back exactly what Delete took off (only things this person had entered)
  undoRemove: async ({ request, platform, locals }) => {
    const db = platform.env.DB, me = locals.user.id;
    let u; try { u = JSON.parse(String((await request.formData()).get('undo') || '')); } catch { return fail(400, { error: "Couldn't undo that." }); }
    if (!(await db.prepare('SELECT 1 FROM items WHERE id = ?').bind(u.item).first())) return fail(400, { error: "Couldn't undo that." });
    const stmts = (u.recs || []).slice(0, 20).map((r) => db.prepare(
      'INSERT OR IGNORE INTO recs (id, item_id, by_user_id, by_guest_id, added_by, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(String(r.id), u.item, r.by_user_id ?? null, r.by_guest_id ?? null, me, r.note ?? null, r.created_at ?? new Date().toISOString().slice(0, 19).replace('T', ' ')));
    if (u.want) stmts.push(db.prepare("INSERT OR IGNORE INTO reactions (user_id, item_id, state) VALUES (?, ?, 'wanted')").bind(me, u.item));
    if (stmts.length) await db.batch(stmts);
    return { restored: true };
  },
  react: async ({ request, platform, locals }) => {
    const f = await request.formData();
    try {
      await react(platform.env.DB, locals.user.id, String(f.get('item')), String(f.get('state')), f.get('reaction') ? String(f.get('reaction')) : null, f.get('share') === '1');
    } catch (e) {
      return fail(400, { error: e.message });
    }
  }
};
