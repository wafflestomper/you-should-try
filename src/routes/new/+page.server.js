import { fail, redirect } from '@sveltejs/kit';
import { saveList } from '$lib/server/lists.js';

export async function load({ platform, url }) {
  const categories = (await platform.env.DB.prepare('SELECT * FROM categories ORDER BY sort').all()).results;
  const preset = categories.find((c) => c.id === url.searchParams.get('category'))?.id ?? null;
  return { categories, preset };
}

export const actions = {
  save: async ({ request, platform, locals }) => {
    let payload;
    try { payload = JSON.parse(String((await request.formData()).get('payload'))); } catch { return fail(400, { message: 'Something went wrong reading your list. Try again.' }); }
    let saved;
    try { saved = await saveList(platform.env.DB, locals.user, payload); } catch (e) { return fail(400, { message: e.message }); }
    redirect(303, `/list/${saved.id}`);
  }
};
