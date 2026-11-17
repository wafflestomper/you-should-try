import { redirect } from '@sveltejs/kit';
import { createSession, sessionUser, pickColor } from '$lib/server/auth.js';
import { acceptInvite, validInvite } from '$lib/server/invites.js';

function decodeJwt(token) {
  const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = new TextDecoder().decode(Uint8Array.from(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')), (c) => c.charCodeAt(0)));
  return JSON.parse(json);
}

export async function GET({ url, cookies, platform }) {
  const env = platform.env;
  const db = env.DB;
  const secure = url.protocol === 'https:';
  const fail = (why) => redirect(303, `/signin?error=${why}`);

  const state = cookies.get('yst_oauth_state');
  cookies.delete('yst_oauth_state', { path: '/' });
  if (!state || state !== url.searchParams.get('state') || !url.searchParams.get('code')) fail('try-again');

  // Swap the one-time code for Google's ID token (straight from Google over HTTPS)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: url.searchParams.get('code'),
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/auth/google/callback`,
      grant_type: 'authorization_code'
    })
  });
  if (!res.ok) fail('try-again');
  const { id_token } = await res.json();
  const g = decodeJwt(id_token);
  if (g.aud !== env.GOOGLE_CLIENT_ID || !['accounts.google.com', 'https://accounts.google.com'].includes(g.iss) || !g.email_verified) fail('try-again');
  const email = String(g.email).toLowerCase();
  const name = g.name || email.split('@')[0];

  let user = await db.prepare("SELECT * FROM users WHERE google_sub = ?").bind(g.sub).first();
  if (!user) {
    user = await db.prepare('SELECT * FROM users WHERE lower(email) = ?').bind(email).first();
    if (user) await db.prepare('UPDATE users SET google_sub = ? WHERE id = ?').bind(g.sub, user.id).run();
  }
  if (!user) {
    // A guest who started from an invite keeps everything they made
    const current = await sessionUser(db, cookies);
    if (current?.is_guest) {
      await db.prepare('UPDATE users SET google_sub = ?, email = ?, is_guest = 0 WHERE id = ?').bind(g.sub, email, current.id).run();
      user = current;
    }
  }
  if (!user) {
    const code = cookies.get('yst_invite');
    const invite = code ? await validInvite(db, code) : null;
    if (invite) user = await acceptInvite(db, invite, { name, email, google_sub: g.sub });
  }
  if (!user) {
    const admins = String(env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    if (admins.includes(email)) {
      // The first admin takes over the demo "Z" account so lists made during setup stay theirs
      const z = await db.prepare("SELECT * FROM users WHERE id = 'u-z' AND email IS NULL AND google_sub IS NULL").first();
      if (z) {
        await db.prepare('UPDATE users SET email = ?, google_sub = ?, is_admin = 1 WHERE id = ?').bind(email, g.sub, z.id).run();
        user = z;
      } else {
        const id = crypto.randomUUID();
        await db.prepare('INSERT INTO users (id, name, email, google_sub, color, is_admin, reviewed) VALUES (?, ?, ?, ?, ?, 1, 1)')
          .bind(id, name, email, g.sub, pickColor()).run();
        user = { id };
      }
    }
  }
  if (!user) fail('invite');
  if (user.status === 'revoked') fail('revoked');

  cookies.delete('yst_invite', { path: '/' });
  await createSession(db, cookies, user.id, secure);
  const next = cookies.get('yst_next');
  cookies.delete('yst_next', { path: '/' });
  redirect(303, next && next.startsWith('/') ? next : '/');
}
