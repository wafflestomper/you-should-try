import { error, fail } from '@sveltejs/kit';

const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results;

export async function load({ locals, platform, url }) {
  if (!locals.realUser?.is_admin) error(403, 'Admins only.');
  const db = platform.env.DB;
  const [newbies, invites, circles, demo] = await Promise.all([
    all(db, `SELECT u.id, u.name, u.color, u.is_guest, u.knows_note, u.joined_at, i.name AS invited_by_name,
                    (SELECT GROUP_CONCAT(c.name, ', ') FROM circle_members m JOIN circles c ON c.id = m.circle_id WHERE m.user_id = u.id) AS circles
               FROM users u LEFT JOIN users i ON i.id = u.invited_by
              WHERE u.status = 'active' AND u.reviewed = 0 ORDER BY u.joined_at DESC`),
    all(db, `SELECT v.code, v.name, v.created_at, v.expires_at, u.name AS from_name FROM invites v JOIN users u ON u.id = v.created_by
              WHERE v.used_by IS NULL AND v.expires_at > datetime('now') ORDER BY v.created_at DESC`),
    all(db, `SELECT c.*, u.name AS by_name FROM circles c LEFT JOIN users u ON u.id = c.suggested_by WHERE c.status = 'pending'`),
    db.prepare(`SELECT COUNT(*) AS n FROM users WHERE id LIKE 'u-%' AND email IS NULL AND google_sub IS NULL AND id != ?`).bind(locals.realUser.id).first()
  ]);
  const mm = await platform.env.DB.prepare("SELECT value FROM settings WHERE key = 'match_min_shared'").first();
  return { newbies, invites, circles, demoCount: demo.n, origin: url.origin, matchMin: Number(mm?.value ?? 5) };
}

const guard = (locals) => { if (!locals.realUser?.is_admin) error(403, 'Admins only.'); };
const field = async (request, k) => String((await request.formData()).get(k) || '');

export const actions = {
  matchMin: async ({ request, platform, locals }) => {
    if (!locals.realUser?.is_admin) return;
    const n = Math.round(Number((await request.formData()).get('n')));
    if (n >= 1 && n <= 50) await platform.env.DB.prepare("INSERT INTO settings (key, value) VALUES ('match_min_shared', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(String(n)).run();
  },
  keep: async ({ request, platform, locals }) => {
    guard(locals);
    await platform.env.DB.prepare('UPDATE users SET reviewed = 1 WHERE id = ?').bind(await field(request, 'id')).run();
  },
  revoke: async ({ request, platform, locals }) => {
    guard(locals);
    const db = platform.env.DB;
    const id = await field(request, 'id');
    if (id === locals.realUser.id) return fail(400, { message: "You can't revoke yourself." });
    await db.batch([
      db.prepare("UPDATE users SET status = 'revoked', reviewed = 1 WHERE id = ?").bind(id),
      db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id)
    ]);
  },
  cancelInvite: async ({ request, platform, locals }) => {
    guard(locals);
    await platform.env.DB.prepare("UPDATE invites SET expires_at = datetime('now') WHERE code = ?").bind(await field(request, 'code')).run();
  },
  approveCircle: async ({ request, platform, locals }) => {
    guard(locals);
    const db = platform.env.DB;
    const id = await field(request, 'id');
    const c = await db.prepare('SELECT * FROM circles WHERE id = ?').bind(id).first();
    if (!c) return;
    const stmts = [db.prepare("UPDATE circles SET status = 'ok' WHERE id = ?").bind(id)];
    if (c.suggested_by) stmts.push(db.prepare('INSERT OR IGNORE INTO circle_members (circle_id, user_id) VALUES (?, ?)').bind(id, c.suggested_by));
    await db.batch(stmts);
  },
  declineCircle: async ({ request, platform, locals }) => {
    guard(locals);
    await platform.env.DB.prepare("DELETE FROM circles WHERE id = ? AND status = 'pending'").bind(await field(request, 'id')).run();
  },
  clearDemo: async ({ platform, locals }) => {
    guard(locals);
    const db = platform.env.DB;
    const ids = (await db.prepare(`SELECT id FROM users WHERE id LIKE 'u-%' AND email IS NULL AND google_sub IS NULL AND id != ?`).bind(locals.realUser.id).all()).results.map((r) => r.id);
    if (!ids.length) return;
    const q = ids.map(() => '?').join(',');
    const lists = `SELECT id FROM lists WHERE owner_id IN (${q})`;
    await db.batch([
      db.prepare(`DELETE FROM list_entries WHERE list_id IN (${lists})`).bind(...ids),
      db.prepare(`DELETE FROM list_tags WHERE list_id IN (${lists})`).bind(...ids),
      db.prepare(`DELETE FROM list_snapshots WHERE list_id IN (${lists})`).bind(...ids),
      db.prepare(`UPDATE try_items SET from_list_id = NULL WHERE from_list_id IN (${lists})`).bind(...ids),
      db.prepare(`DELETE FROM notifications WHERE user_id IN (${q}) OR actor_id IN (${q}) OR list_id IN (${lists})`).bind(...ids, ...ids, ...ids),
      db.prepare(`DELETE FROM lists WHERE owner_id IN (${q})`).bind(...ids),
      db.prepare(`DELETE FROM try_items WHERE user_id IN (${q})`).bind(...ids),
      db.prepare(`UPDATE try_items SET from_user_id = NULL WHERE from_user_id IN (${q})`).bind(...ids),
      db.prepare(`DELETE FROM recommendations WHERE from_user_id IN (${q}) OR to_user_id IN (${q})`).bind(...ids, ...ids),
      db.prepare(`DELETE FROM circle_members WHERE user_id IN (${q})`).bind(...ids),
      db.prepare(`UPDATE circles SET suggested_by = NULL WHERE suggested_by IN (${q})`).bind(...ids),
      db.prepare(`UPDATE users SET invited_by = NULL WHERE invited_by IN (${q})`).bind(...ids),
      db.prepare(`DELETE FROM sessions WHERE user_id IN (${q})`).bind(...ids),
      db.prepare(`DELETE FROM users WHERE id IN (${q})`).bind(...ids)
    ]);
  }
};
