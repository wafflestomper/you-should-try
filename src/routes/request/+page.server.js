import { fail, redirect } from '@sveltejs/kit';
import { canSend, sendEmail } from '$lib/server/email.js';

export async function load({ locals }) {
  if (locals.realUser && !locals.realUser.is_guest) redirect(303, '/');
  return {};
}

const text = (f, k, n) => String(f.get(k) || '').trim().slice(0, n);

async function hash(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const actions = {
  default: async ({ request, platform, getClientAddress, url }) => {
    const env = platform.env, db = env.DB;
    const f = await request.formData();
    const name = text(f, 'name', 60), email = text(f, 'email', 120).toLowerCase(), knows = text(f, 'knows', 140), note = text(f, 'note', 400);
    const keep = { name, email, knows, note };
    // A hidden field people never see. Bots that fill in every box get a polite "thanks" and nothing is saved.
    if (text(f, 'website', 200)) return { sent: true };
    if (!name || !email || !knows) return fail(400, { ...keep, message: 'Add your name, your email, and who you know here.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, { ...keep, message: "That email doesn't look right." });

    let ip = '';
    try { ip = request.headers.get('cf-connecting-ip') || getClientAddress(); } catch { /* not available locally */ }
    const ipHash = ip ? await hash(ip) : null;
    const recent = await db.prepare(`SELECT
        (SELECT COUNT(*) FROM invite_requests WHERE email = ? AND created_at > datetime('now', '-1 day')) AS same,
        (SELECT COUNT(*) FROM invite_requests WHERE ip_hash = ? AND created_at > datetime('now', '-1 day')) AS fromHere`).bind(email, ipHash).first();
    if (recent.same > 0) return { sent: true };
    if (recent.fromHere >= 5) return fail(429, { ...keep, message: "That's a lot of requests from here today. Try again tomorrow." });

    await db.prepare('INSERT INTO invite_requests (id, name, email, knows, note, ip_hash) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), name, email, knows, note || null, ipHash).run();

    // Let the admin know, if the site can send email
    const admin = String(env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean)[0];
    if (admin && canSend(env)) {
      const lines = [`${name} asked for an invite to You Should Try.`, '', `Email: ${email}`, `Knows: ${knows}`, ...(note ? [`Note: ${note}`] : []), '', `Invite them or dismiss it on the Admin page:`, `${url.origin}/admin#requests`];
      const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      await sendEmail(env, {
        to: admin, fromName: 'You Should Try', replyTo: email,
        subject: `Invite request: ${name}`, text: lines.join('\n'),
        html: `<div style="font:16px/1.55 -apple-system,Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:520px">${lines.map((l) => l.startsWith('http') ? `<p><a href="${esc(l)}">Open the Admin page</a></p>` : l ? `<p style="margin:0 0 6px">${esc(l)}</p>` : '<br>').join('')}</div>`
      }).catch(() => {});
    }
    return { sent: true };
  }
};
