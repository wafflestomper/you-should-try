import { getHome } from '$lib/server/data.js';

export async function load({ platform, locals }) {
  return await getHome(platform.env.DB, locals.user);
}
