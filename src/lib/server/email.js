// Sending email through Resend. The key lives in the Cloudflare secret RESEND_API_KEY.
import { inviteLines, inviteSubject } from '$lib/inviteText.js';

export const canSend = (env) => !!(env.RESEND_API_KEY || env.MAIL_DRY_RUN);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function sendEmail(env, { to, subject, text, html, replyTo, fromName }) {
  const domain = env.MAIL_DOMAIN || 'try.zollinhofer.com';
  const from = `${String(fromName || 'You Should Try').replace(/[<>"]/g, '')} via You Should Try <invites@${domain}>`;
  if (env.MAIL_DRY_RUN) {
    console.log('[email dry run]', JSON.stringify({ from, to, replyTo, subject }), '\n' + text);
    return { ok: true, id: 'dry-run' };
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, html, ...(replyTo ? { reply_to: replyTo } : {}) })
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = out?.message || `status ${r.status}`;
    if (r.status === 401 || r.status === 403) return { ok: false, error: `The email service turned the key down (${msg}). Check the RESEND_API_KEY secret and that try.zollinhofer.com shows Verified in Resend.` };
    return { ok: false, error: `The email didn't go out (${msg}). Try again, or use "Email it" to send from your own email.` };
  }
  return { ok: true, id: out.id };
}

export function inviteEmail({ toName, fromName, picks, link }) {
  const lines = inviteLines({ toName, fromName, picks, link });
  const text = lines.join('\n');
  const paras = []; let cur = [];
  for (const l of lines) { if (l === '') { if (cur.length) paras.push(cur); cur = []; } else cur.push(l); }
  if (cur.length) paras.push(cur);
  const body = paras.map((p) => p.includes(link)
    ? `<p style="margin:0 0 16px">${esc(p.filter((l) => l !== link).join(' '))}</p><p style="margin:0 0 20px"><a href="${esc(link)}" style="display:inline-block;background:#141414;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">Open my invite</a></p>`
    : `<p style="margin:0 0 16px">${p.map(esc).join('<br>')}</p>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f2"><div style="max-width:520px;margin:0 auto;padding:28px 22px;font:16px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a">
<div style="font-weight:800;font-size:15px;margin-bottom:18px"><span style="color:#2563EB">&#9679;</span><span style="color:#DC2626">&#9679;</span><span style="color:#0D9488">&#9679;</span> you should try</div>
<div style="background:#ffffff;border-radius:16px;padding:24px 22px">${body}</div>
<p style="font-size:12.5px;color:#777;margin:16px 4px 0">You got this because ${esc(fromName)} invited you. If it's not for you, just ignore it and the link expires on its own.</p>
</div></body></html>`;
  return { subject: inviteSubject(fromName), text, html };
}
