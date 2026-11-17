import { getHome } from '$lib/server/data.js';
import { saveToTry } from '$lib/server/actions.js';

export async function load({ platform, locals }) {
  return await getHome(platform.env.DB, locals.user);
}

export const actions = {
  accept: async ({ request, platform, locals }) => {
    const f = await request.formData();
    await saveToTry(platform.env.DB, locals.user, String(f.get('item')), null, String(f.get('from') || '') || null);
  }
};
