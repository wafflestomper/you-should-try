// Turn "let friends see what I'm watching" on or off.
import { json, error } from '@sveltejs/kit';
export async function POST({ platform, locals, request }) {
  if (!locals.user) error(401, 'Sign in first.');
  const { on } = await request.json().catch(() => ({}));
  await platform.env.DB.prepare('UPDATE users SET share_watching = ? WHERE id = ?').bind(on ? 1 : 0, locals.user.id).run();
  return json({ sharing: !!on });
}
