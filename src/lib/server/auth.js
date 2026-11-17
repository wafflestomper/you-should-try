// Sessions and sign-in helpers.
const DAYS = 60;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const randomToken = (bytes = 32) => hex(crypto.getRandomValues(new Uint8Array(bytes)));
export async function sha256(text) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))); }

export async function createSession(db, cookies, userId, secure) {
  const token = randomToken();
  await db.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+${DAYS} days'))`)
    .bind(await sha256(token), userId).run();
  cookies.set('yst_session', token, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: 60 * 60 * 24 * DAYS });
}

export async function sessionUser(db, cookies) {
  const token = cookies.get('yst_session');
  if (!token) return null;
  return await db.prepare(
    `SELECT u.id, u.name, u.color, u.email, u.is_admin, u.is_guest FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.status = 'active'`).bind(await sha256(token)).first();
}

export async function destroySession(db, cookies) {
  const token = cookies.get('yst_session');
  if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  cookies.delete('yst_session', { path: '/' });
}

const COLORS = ['#2F5BD3', '#8A3B78', '#C2410C', '#13877A', '#9A3412', '#1D4ED8', '#0F766E', '#B45309', '#4338CA', '#047857', '#7E2A35', '#56345A'];
export const pickColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
