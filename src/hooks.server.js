import { redirect } from '@sveltejs/kit';
import { sessionUser } from '$lib/server/auth.js';

// Pages anyone can open without signing in
const PUBLIC = ['/signin', '/auth/', '/invite/', '/favicon', '/manifest', '/icon-', '/apple-touch', '/install', '/privacy', '/request'];

export async function handle({ event, resolve }) {
  const db = event.platform?.env?.DB;
  event.locals.user = null;
  event.locals.realUser = null;
  if (db) {
    const me = await sessionUser(db, event.cookies);
    event.locals.realUser = me;
    event.locals.user = me;
    // Admins can look at the site as someone else, to check how it looks for them
    const viewAs = event.cookies.get('yst_view_as');
    if (me?.is_admin && viewAs && viewAs !== me.id) {
      const other = await db.prepare("SELECT id, name, color, email, is_admin, is_guest, how_known FROM users WHERE id = ? AND status = 'active'").bind(viewAs).first();
      if (other) event.locals.user = other;
    }
  }
  const path = event.url.pathname;
  // While an admin is viewing as someone else, block changes so nothing is made in their name
  if (event.locals.user && event.locals.realUser && event.locals.user.id !== event.locals.realUser.id
      && event.request.method !== 'GET' && !['/view-as', '/signout'].includes(path)) {
    const message = `You're viewing the site as ${event.locals.user.name}. Use "Back to me" at the top before making changes.`;
    // Buttons on the page expect a JSON answer; plain form posts get the text.
    if (event.request.headers.get('x-sveltekit-action') === 'true')
      return new Response(JSON.stringify({ type: 'error', status: 403, error: { message } }), { status: 403, headers: { 'content-type': 'application/json' } });
    return new Response(message, { status: 403 });
  }
  if (db && !event.locals.user && !PUBLIC.some((p) => path.startsWith(p))) {
    if (path.startsWith('/api/')) return new Response('Sign in first.', { status: 401 });
    redirect(303, '/signin');
  }
  return resolve(event);
}
