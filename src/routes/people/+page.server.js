import { fail } from '@sveltejs/kit';
import { tasteMatch } from '$lib/server/data.js';
import { createInvite } from '$lib/server/invites.js';

export async function load({ platform, locals, url }) {
  const db = platform.env.DB;
  const users = (await db.prepare(
    `SELECT u.id, u.name, u.color, GROUP_CONCAT(c.name, ', ') AS circles
       FROM users u LEFT JOIN circle_members m ON m.user_id = u.id LEFT JOIN circles c ON c.id = m.circle_id AND c.status = 'ok'
      WHERE u.status = 'active' GROUP BY u.id ORDER BY u.name`).all()).results;
  const rows = (await db.prepare(
    `SELECT l.owner_id, e.item_id, MIN(e.position) AS pos FROM list_entries e JOIN lists l ON l.id = e.list_id GROUP BY l.owner_id, e.item_id`).all()).results;
  const by = {};
  for (const r of rows) (by[r.owner_id] ||= {})[r.item_id] = r.pos;
  const people = users.filter((u) => u.id !== locals.user.id).map((u) => ({ ...u, pct: tasteMatch(by[locals.user.id], by[u.id]).pct }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  const circles = (await db.prepare(
    `SELECT c.id, c.name, c.color, EXISTS(SELECT 1 FROM circle_members m WHERE m.circle_id = c.id AND m.user_id = ?) AS mine,
            (SELECT COUNT(*) FROM circle_members m WHERE m.circle_id = c.id) AS n
       FROM circles c WHERE c.status = 'ok' ORDER BY c.name`).bind(locals.user.id).all()).results;
  return { people, circles, origin: url.origin };
}

const text = (f, k, n) => String(f.get(k) || '').trim().slice(0, n);

export const actions = {
  invite: async ({ request, platform, locals }) => {
    const f = await request.formData();
    const name = text(f, 'name', 60), knows = text(f, 'knows', 140), email = text(f, 'email', 120);
    if (!name || !knows) return fail(400, { invite: true, message: 'Add their name and how you know them. Admins see that line when reviewing new people.' });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return fail(400, { invite: true, message: "That email doesn't look right. Fix it or leave it blank." });
    const code = await createInvite(platform.env.DB, locals.user, { name, email, circle_id: text(f, 'circle', 60) || null, knows_note: knows });
    return { invite: true, code, name };
  },
  suggestCircle: async ({ request, platform, locals }) => {
    const f = await request.formData();
    const name = text(f, 'name', 40);
    if (!name) return fail(400, { circle: true, message: 'Give the circle a name.' });
    await platform.env.DB.prepare(`INSERT INTO circles (id, name, color, status, suggested_by, note) VALUES (?, ?, ?, 'pending', ?, ?)`)
      .bind(crypto.randomUUID(), name, ['#5B4BB7', '#B42318', '#0E7490', '#4D7C0F', '#A16207'][Math.floor(Math.random() * 5)], locals.user.id, text(f, 'note', 140) || null).run();
    return { circle: true, sent: name };
  },
  toggleCircle: async ({ request, platform, locals }) => {
    const f = await request.formData();
    const id = text(f, 'id', 60);
    const db = platform.env.DB;
    if (f.get('mine') === '1') await db.prepare('DELETE FROM circle_members WHERE circle_id = ? AND user_id = ?').bind(id, locals.user.id).run();
    else await db.prepare("INSERT OR IGNORE INTO circle_members (circle_id, user_id) SELECT id, ? FROM circles WHERE id = ? AND status = 'ok'").bind(locals.user.id, id).run();
  }
};
