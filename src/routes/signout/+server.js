import { redirect } from '@sveltejs/kit';
import { destroySession } from '$lib/server/auth.js';

export async function POST({ platform, cookies }) {
  await destroySession(platform.env.DB, cookies);
  cookies.delete('yst_view_as', { path: '/' });
  redirect(303, '/signin');
}
