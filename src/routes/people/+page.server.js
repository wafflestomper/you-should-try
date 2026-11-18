import { fail } from '@sveltejs/kit';
import { createInvite } from '$lib/server/invites.js';
import { tasteMatches, shortNames } from '$lib/server/board.js';
import { canSend, sendEmail, inviteEmail } from '$lib/server/email.js';

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
  const reqId = url.searchParams.get('req');
  const req = reqId && locals.realUser?.is_admin
    ? await db.prepare("SELECT id, name, email, knows FROM invite_requests WHERE id = ? AND status = 'new'").bind(reqId).first()
    : null;
  const gid = url.searchParams.get('guest');
  const prefill = gid ? await db.prepare('SELECT id, name, email FROM guests WHERE id = ? AND user_id IS NULL').bind(gid).first() : null;
  return { people, guests: guests.results, origin: url.origin, myName: locals.user.name, canSend: canSend(platform.env), req, prefill };
}

const text = (f, k, n) => String(f.get(k) || '').trim().slice(0, n);

export const actions = {
  invite: async ({ request, platform, locals }) => {
    const f = await request.formData();
    const name = text(f, 'name', 60), email = text(f, 'email', 120);
    const knows = text(f, 'knows', 140) || null;
    const guest = text(f, 'guest', 60) || null;
    if (!name) return fail(400, { message: 'Add their name.', name, email, guest });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return fail(400, { message: "That email doesn't look right. Fix it or leave it blank.", name, knows, email, guest });
    if (guest) {
      const g = await platform.env.DB.prepare('SELECT id FROM guests WHERE id = ? AND user_id IS NULL').bind(guest).first();
      if (!g) return fail(400, { message: 'That person already joined.', name, knows, email });
      if (email) await platform.env.DB.prepare('UPDATE guests SET email = ? WHERE id = ?').bind(email, guest).run();
    }
    const code = await createInvite(platform.env.DB, locals.user, { name, email, knows_note: knows, guest_id: guest });
    const req = text(f, 'req', 60);
    if (req && locals.realUser?.is_admin) await platform.env.DB.prepare("UPDATE invite_requests SET status = 'invited' WHERE id = ?").bind(req).run();
    const picks = guest ? (await platform.env.DB.prepare('SELECT COUNT(*) AS n FROM recs WHERE by_guest_id = ?').bind(guest).first()).n : 0;
    return { code, name, email, picks };
  },

  send: async ({ request, platform, locals, url }) => {
    const env = platform.env, db = env.DB;
    const f = await request.formData();
    const code = text(f, 'code', 40), to = text(f, 'to', 120);
    const inv = await db.prepare(`SELECT * FROM invites WHERE code = ? AND created_by = ? AND used_by IS NULL AND expires_at > datetime('now')`).bind(code, locals.user.id).first();
    if (!inv) return fail(400, { sendError: 'That invite is used up or expired. Make a new one.' });
    const picks = inv.guest_id ? (await db.prepare('SELECT COUNT(*) AS n FROM recs WHERE by_guest_id = ?').bind(inv.guest_id).first()).n : 0;
    const keep = { code, name: inv.name, email: to || inv.email || '', picks };
    if (!canSend(env)) return fail(400, { ...keep, sendError: "The site can't send email yet. Use Email it for now." });
    if (!/^\S+@\S+\.\S+$/.test(to)) return fail(400, { ...keep, sendError: 'Add their email address first.' });
    if (inv.emailed_count >= 3) return fail(400, { ...keep, sendError: 'This invite has already been emailed 3 times. Text it or copy the link instead.' });
    const link = `${url.origin}/invite/${code}`;
    const msg = inviteEmail({ toName: inv.name, fromName: locals.user.name, picks, link });
    const r = await sendEmail(env, { to, ...msg, replyTo: locals.user.email, fromName: locals.user.name });
    if (!r.ok) return fail(502, { ...keep, sendError: r.error });
    await db.batch([
      db.prepare(`UPDATE invites SET email = ?, emailed_at = datetime('now'), emailed_count = emailed_count + 1 WHERE code = ?`).bind(to, code),
      ...(inv.guest_id ? [db.prepare('UPDATE guests SET email = ? WHERE id = ? AND email IS NULL').bind(to, inv.guest_id)] : [])
    ]);
    return { ...keep, sent: to };
  }
};
