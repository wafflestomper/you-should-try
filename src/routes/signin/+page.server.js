import { redirect } from '@sveltejs/kit';
export async function load({ locals, url, platform }) {
  if (locals.realUser && !locals.realUser.is_guest) redirect(303, '/');
  const messages = {
    invite: "That Google account isn't on You Should Try yet. Ask a friend for an invite link, then sign in from it.",
    revoked: 'This account no longer has access.',
    'try-again': 'Sign-in did not finish. Try again.'
  };
  return {
    error: messages[url.searchParams.get('error')] ?? null,
    googleReady: !!platform.env.GOOGLE_CLIENT_ID,
    dev: platform.env.DEV_LOGIN === '1',
    guest: !!locals.realUser?.is_guest
  };
}
