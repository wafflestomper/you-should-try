import { error } from '@sveltejs/kit';
import { getItem } from '$lib/server/data.js';
import { saveToTry, removeFromTry } from '$lib/server/actions.js';

export async function load({ params, platform, locals }) {
  const db = platform.env.DB;
  const data = await getItem(db, params.id);
  if (!data) error(404, 'We could not find that.');
  const saved = await db.prepare('SELECT 1 FROM try_items WHERE user_id = ? AND item_id = ?').bind(locals.user.id, params.id).first();
  return { ...data, saved: !!saved };
}

export const actions = {
  try: async ({ request, platform, locals, params }) => {
    const f = await request.formData();
    if (f.get('saved') === '1') await removeFromTry(platform.env.DB, locals.user, params.id);
    else await saveToTry(platform.env.DB, locals.user, params.id, f.get('list') || null);
  }
};
