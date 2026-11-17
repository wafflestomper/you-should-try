import { redirect, error } from '@sveltejs/kit';
import { randomToken } from '$lib/server/auth.js';

export async function GET({ url, cookies, platform }) {
  const clientId = platform.env.GOOGLE_CLIENT_ID;
  if (!clientId) error(503, 'Google sign-in is not set up yet.');
  const state = randomToken(16);
  const secure = url.protocol === 'https:';
  cookies.set('yst_oauth_state', state, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: 600 });
  const next = url.searchParams.get('next');
  if (next && next.startsWith('/')) cookies.set('yst_next', next, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: 600 });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${url.origin}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });
  redirect(303, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
