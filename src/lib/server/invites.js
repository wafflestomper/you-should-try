// Invite links: single use, good for 7 days.
import { randomToken, pickColor } from './auth.js';

export async function createInvite(db, me, { name, email, circle_id, knows_note }) {
  const code = randomToken(9);
  await db.prepare(
    `INSERT INTO invites (code, created_by, circle_id, name, email, knows_note, expires_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+7 days'))`)
    .bind(code, me.id, circle_id || null, name, email || null, knows_note).run();
  return code;
}

export async function validInvite(db, code) {
  return await db.prepare(
    `SELECT i.*, u.name AS from_name, c.name AS circle_name FROM invites i
       JOIN users u ON u.id = i.created_by AND u.status = 'active'
       LEFT JOIN circles c ON c.id = i.circle_id
      WHERE i.code = ? AND i.used_by IS NULL AND i.expires_at > datetime('now')`).bind(code).first();
}

/** Turn an invite into a new person. With no Google details, they start as a guest. */
export async function acceptInvite(db, invite, { name, email = null, google_sub = null }) {
  const id = crypto.randomUUID();
  const stmts = [
    db.prepare(`INSERT INTO users (id, name, email, google_sub, color, is_guest, invited_by, knows_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, String(name).trim().slice(0, 60) || 'New friend', email, google_sub, pickColor(), google_sub ? 0 : 1, invite.created_by, invite.knows_note),
    db.prepare(`UPDATE invites SET used_by = ?, used_at = datetime('now') WHERE code = ?`).bind(id, invite.code)
  ];
  if (invite.circle_id) stmts.push(db.prepare('INSERT OR IGNORE INTO circle_members (circle_id, user_id) VALUES (?, ?)').bind(invite.circle_id, id));
  await db.batch(stmts);
  return { id, status: 'active' };
}
