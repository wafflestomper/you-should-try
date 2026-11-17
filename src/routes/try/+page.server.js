import { getTryList } from '$lib/server/data.js';
import { removeFromTry } from '$lib/server/actions.js';

export async function load({ platform, locals }) {
  return { items: await getTryList(platform.env.DB, locals.user.id) };
}

export const actions = {
  remove: async ({ request, platform, locals }) => {
    const f = await request.formData();
    await removeFromTry(platform.env.DB, locals.user, String(f.get('item')));
  }
};
