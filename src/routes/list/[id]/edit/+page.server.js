import { error, fail, redirect } from '@sveltejs/kit';
import { saveList, listForEditor } from '$lib/server/lists.js';

export async function load({ params, platform, locals }) {
  const db = platform.env.DB;
  const list = await listForEditor(db, params.id);
  if (!list) error(404, 'That list does not exist.');
  if (list.owner_id !== locals.user.id) error(403, 'You can only edit your own lists.');
  const categories = (await db.prepare('SELECT * FROM categories ORDER BY sort').all()).results;
  return { list, categories };
}

export const actions = {
  save: async ({ request, platform, locals, params }) => {
    let payload;
    try { payload = JSON.parse(String((await request.formData()).get('payload'))); } catch { return fail(400, { message: 'Something went wrong reading your list. Try again.' }); }
    try { await saveList(platform.env.DB, locals.user, payload, params.id); } catch (e) { return fail(400, { message: e.message }); }
    redirect(303, `/list/${params.id}`);
  },
  delete: async ({ platform, locals, params }) => {
    const db = platform.env.DB;
    const list = await db.prepare('SELECT owner_id FROM lists WHERE id = ?').bind(params.id).first();
    if (!list || list.owner_id !== locals.user.id) return fail(403, { message: 'You can only delete your own lists.' });
    await db.batch([
      db.prepare('DELETE FROM list_entries WHERE list_id = ?').bind(params.id),
      db.prepare('DELETE FROM list_tags WHERE list_id = ?').bind(params.id),
      db.prepare('DELETE FROM list_snapshots WHERE list_id = ?').bind(params.id),
      db.prepare('UPDATE try_items SET from_list_id = NULL WHERE from_list_id = ?').bind(params.id),
      db.prepare('UPDATE notifications SET list_id = NULL WHERE list_id = ?').bind(params.id),
      db.prepare('DELETE FROM lists WHERE id = ?').bind(params.id)
    ]);
    redirect(303, '/');
  }
};
