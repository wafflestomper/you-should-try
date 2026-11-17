import { error, redirect } from '@sveltejs/kit';
import { createSession } from '$lib/server/auth.js';

// Local testing only: sign in as anyone. Turned off unless DEV_LOGIN is set to 1.
export async function GET({ url, platform, cookies }) {
  if (platform.env.DEV_LOGIN !== '1') error(404, 'Not found');
  await createSession(platform.env.DB, cookies, url.searchParams.get('user') || 'u-z', false);
  redirect(303, '/');
}
