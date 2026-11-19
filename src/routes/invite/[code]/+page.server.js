import { fail, redirect } from '@sveltejs/kit';
import { validInvite, acceptInvite } from '$lib/server/invites.js';
import { createSession } from '$lib/server/auth.js';

export async function load({ params, platform, locals }) {
  if (locals.realUser && !locals.realUser.is_guest) redirect(303, '/');
  const invite = await validInvite(platform.env.DB, params.code);
  return {
    invite: invite && { name: invite.name, from: invite.from_name, knows: invite.knows_note, circle: invite.circle_name, email: invite.email },
    googleReady: !!platform.env.GOOGLE_CLIENT_ID
  };
}

export const actions = {
  guest: async ({ params, request, platform, cookies, url }) => {
    const db = platform.env.DB;
    const invite = await validInvite(db, params.code);
    if (!invite) return fail(400, { message: 'This invite has already been used or has expired. Ask your friend for a new one.' });
    const name = String((await request.formData()).get('name') || '').trim();
    if (!name) return fail(400, { message: 'Tell us your name so friends know who you are.' });
    const user = await acceptInvite(db, invite, { name });
    await createSession(db, cookies, user.id, url.protocol === 'https:');
    redirect(303, '/?welcome=1');
  },
  google: async ({ params, platform, cookies, url }) => {
    const invite = await validInvite(platform.env.DB, params.code);
    if (!invite) return fail(400, { message: 'This invite has already been used or has expired. Ask your friend for a new one.' });
    cookies.set('yst_invite', params.code, { path: '/', httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: 900 });
    redirect(303, '/auth/google');
  }
};
