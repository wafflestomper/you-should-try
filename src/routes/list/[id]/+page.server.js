import { error } from '@sveltejs/kit';
import { getList } from '$lib/server/data.js';
import { saveToTry, removeFromTry } from '$lib/server/actions.js';

export async function load({ params, platform, locals }) {
  const data = await getList(platform.env.DB, params.id, locals.user);
  if (!data) error(404, 'That list does not exist.');
  return data;
}

export const actions = {
  try: async ({ request, platform, locals, params }) => {
    const f = await request.formData();
    const item = String(f.get('item'));
    if (f.get('saved') === '1') await removeFromTry(platform.env.DB, locals.user, item);
    else await saveToTry(platform.env.DB, locals.user, item, params.id);
  }
};
