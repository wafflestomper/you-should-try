import { fail } from '@sveltejs/kit';
import { createInvite } from '$lib/server/invites.js';
import { tasteMatches, shortNames } from '$lib/server/board.js';

export async function load({ platform, locals, url }) {
  const db = platform.env.DB;
  const me = locals.user.id;
  const [members, guests, matches, shorts] = await Promise.all([
    db.prepare(`SELECT u.id, u.name, u.how_known, (SELECT COUNT(DISTINCT item_id) FROM recs r WHERE r.by_user_id = u.id) AS picks
                FROM users u WHERE u.status = 'active' AND u.id != ? ORDER BY u.name`).bind(me).all(),
    db.prepare(`SELECT g.id, g.name, (SELECT COUNT(*) FROM recs r WHERE r.by_guest_id = g.id) AS picks,
                  (SELECT MAX(i.created_at) FROM invites i WHERE i.guest_id = g.id AND i.used_by IS NULL AND i.expires_at > datetime('now')) AS invited_at
                FROM guests g WHERE g.user_id IS NULL ORDER BY picks DESC, g.name`).all(),
    tasteMatches(db, me),
    shortNames(db)
  ]);
  const people = members.results.map((m) => ({ ...m, short: shorts[`u:${m.id}`] ?? m.name, match: matches[m.id] ? Math.round(50 + 50 * matches[m.id].score) : null }))
    .sort((a, b) => (b.match ?? -1) - (a.match ?? -1) || a.name.localeCompare(b.name));
  return { people, guests: guests.results, origin: url.origin, myName: locals.user.name };
}

const text = (f, k, n) => String(f.get(k) || '').trim().slice(0, n);

export const actions = {
  invite: async ({ request, platform, locals }) => {
    const f = await request.formData();
    const name = text(f, 'name', 60), knows = text(f, 'knows', 140), email = text(f, 'email', 120);
    const guest = text(f, 'guest', 60) || null;
    if (!name || !knows) return fail(400, { message: 'Add their name and how you know them. The admin sees that line when new people join.', name, knows, email, guest });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return fail(400, { message: "That email doesn't look right. Fix it or leave it blank.", name, knows, email, guest });
    if (guest) {
      const g = await platform.env.DB.prepare('SELECT id FROM guests WHERE id = ? AND user_id IS NULL').bind(guest).first();
      if (!g) return fail(400, { message: 'That person already joined.', name, knows, email });
      if (email) await platform.env.DB.prepare('UPDATE guests SET email = ? WHERE id = ?').bind(email, guest).run();
    }
    const code = await createInvite(platform.env.DB, locals.user, { name, email, knows_note: knows, guest_id: guest });
    const picks = guest ? (await platform.env.DB.prepare('SELECT COUNT(*) AS n FROM recs WHERE by_guest_id = ?').bind(guest).first()).n : 0;
    return { code, name, email, picks };
  }
};
