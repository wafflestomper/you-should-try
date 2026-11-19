import { defaultLibraries, defaultLibraryActions } from '$lib/server/libs.js';
import { possibleDups, mergeItems } from '$lib/server/dups.js';
import { error, fail } from '@sveltejs/kit';

const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results;

export async function load({ locals, platform, url }) {
  if (!locals.realUser?.is_admin) error(403, 'Admins only.');
  const db = platform.env.DB;
  const [requests, newbies, invites, circles, demo, videos] = await Promise.all([
    all(db, `SELECT * FROM invite_requests WHERE status = 'new' ORDER BY created_at DESC LIMIT 50`),
    all(db, `SELECT u.id, u.name, u.color, u.is_guest, u.knows_note, u.joined_at, i.name AS invited_by_name,
                    (SELECT GROUP_CONCAT(c.name, ', ') FROM circle_members m JOIN circles c ON c.id = m.circle_id WHERE m.user_id = u.id) AS circles
               FROM users u LEFT JOIN users i ON i.id = u.invited_by
              WHERE u.status = 'active' AND u.reviewed = 0 ORDER BY u.joined_at DESC`),
    all(db, `SELECT v.code, v.name, v.created_at, v.expires_at, u.name AS from_name FROM invites v JOIN users u ON u.id = v.created_by
              WHERE v.used_by IS NULL AND v.expires_at > datetime('now') ORDER BY v.created_at DESC`),
    all(db, `SELECT c.*, u.name AS by_name FROM circles c LEFT JOIN users u ON u.id = c.suggested_by WHERE c.status = 'pending'`),
    db.prepare(`SELECT COUNT(*) AS n FROM users WHERE id LIKE 'u-%' AND email IS NULL AND google_sub IS NULL AND id != ?`).bind(locals.realUser.id).first(),
    all(db, 'SELECT * FROM videos ORDER BY sort')
  ]);
  const dups = await possibleDups(platform.env.DB);
  const defaultLibs = await defaultLibraries(platform.env.DB);
  const mm = await platform.env.DB.prepare("SELECT value FROM settings WHERE key = 'match_min_shared'").first();
  return { videos, videoReady: !!platform.env.VIDEOS, requests, newbies, invites, circles, demoCount: demo.n, origin: url.origin, matchMin: Number(mm?.value ?? 5), dups, defaultLibs };
}

const guard = (locals) => { if (!locals.realUser?.is_admin) error(403, 'Admins only.'); };
const field = async (request, k) => String((await request.formData()).get(k) || '');

export const actions = {
  videoSave: async ({ request, locals, platform }) => {
    guard(locals);
    const f = await request.formData();
    const title = String(f.get('title') || '').trim();
    if (!title) return fail(400, { videoError: 'A video needs a title.' });
    await platform.env.DB.prepare('UPDATE videos SET title = ?, blurb = ?, topic = ? WHERE id = ?')
      .bind(title.slice(0, 80), String(f.get('blurb') || '').trim().slice(0, 200) || null, String(f.get('topic') || '') || null, String(f.get('id'))).run();
  },
  videoMove: async ({ request, locals, platform }) => {
    guard(locals);
    const f = await request.formData();
    const db = platform.env.DB;
    const list = (await db.prepare('SELECT id FROM videos ORDER BY sort').all()).results.map((r) => r.id);
    const i = list.indexOf(String(f.get('id'))), j = i + (f.get('dir') === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await db.batch(list.map((id, n) => db.prepare('UPDATE videos SET sort = ? WHERE id = ?').bind(n + 1, id)));
  },
  videoDelete: async ({ request, locals, platform }) => {
    guard(locals);
    const id = String((await request.formData()).get('id'));
    const db = platform.env.DB;
    const v = await db.prepare('SELECT file_key, poster_key FROM videos WHERE id = ?').bind(id).first();
    if (!v) return;
    await db.prepare('DELETE FROM videos WHERE id = ?').bind(id).run();
    await platform.env.VIDEOS?.delete([v.file_key, v.poster_key].filter(Boolean)).catch(() => {});
  },
  ...defaultLibraryActions,
  merge: async ({ request, platform, locals }) => {
    if (!locals.realUser?.is_admin) return;
    const f = await request.formData();
    await mergeItems(platform.env.DB, locals.realUser.id, String(f.get('from')), String(f.get('to')));
    return { merged: true };
  },
  notDup: async ({ request, platform, locals }) => {
    if (!locals.realUser?.is_admin) return;
    const f = await request.formData();
    const [a, b] = [String(f.get('a')), String(f.get('b'))].sort();
    await platform.env.DB.prepare('INSERT OR IGNORE INTO dup_dismissed (a, b, dismissed_by) VALUES (?, ?, ?)').bind(a, b, locals.realUser.id).run();
  },
  matchMin: async ({ request, platform, locals }) => {
    if (!locals.realUser?.is_admin) return;
    const n = Math.round(Number((await request.formData()).get('n')));
    if (n >= 1 && n <= 50) await platform.env.DB.prepare("INSERT INTO settings (key, value) VALUES ('match_min_shared', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(String(n)).run();
  },
  dismissRequest: async ({ request, platform, locals }) => {
    guard(locals);
    await platform.env.DB.prepare("UPDATE invite_requests SET status = 'dismissed' WHERE id = ?").bind(await field(request, 'id')).run();
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
