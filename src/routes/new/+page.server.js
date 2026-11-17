import { fail, redirect } from '@sveltejs/kit';
import { saveList } from '$lib/server/lists.js';
import { itemLabels } from '$lib/server/search.js';
import { finishItem } from '$lib/server/actions.js';

export async function load({ platform, url }) {
  const db = platform.env.DB;
  const categories = (await db.prepare('SELECT * FROM categories ORDER BY sort').all()).results;
  let preset = categories.find((c) => c.id === url.searchParams.get('category'))?.id ?? null;

  // Started from "Finished it": open the editor with that thing already in at No. 1.
  let initial = null;
  const withId = url.searchParams.get('with');
  const it = withId ? await db.prepare('SELECT * FROM items WHERE id = ?').bind(withId).first() : null;
  if (it) {
    const labels = await itemLabels(db, [it.id]);
    const cat = categories.find((c) => c.id === preset) ?? categories.find((c) => c.kind === it.kind)
      ?? (['restaurant', 'recipe'].includes(it.kind) ? categories.find((c) => c.kind === 'mixed') : null);
    initial = {
      category_id: cat?.id ?? null, custom_subtitle: '', kind: cat?.kind ?? it.kind, title: '', tags: [],
      entries: [{ why: '', dish: '', item: { local_id: it.id, kind: it.kind, title: it.title, creator: it.creator, year: it.year, narrator: it.narrator, image_url: it.image_url, labels: labels[it.id] || [] } }]
    };
  }
  return { categories, preset, initial, withTitle: it?.title ?? null };
}

export const actions = {
  save: async ({ request, platform, locals, url }) => {
    let payload;
    try { payload = JSON.parse(String((await request.formData()).get('payload'))); } catch { return fail(400, { message: 'Something went wrong reading your list. Try again.' }); }
    let saved;
    try { saved = await saveList(platform.env.DB, locals.user, payload); } catch (e) { return fail(400, { message: e.message }); }
    const withId = url.searchParams.get('with');
    if (withId) {
      await finishItem(platform.env.DB, locals.user, withId, {
        reaction: url.searchParams.get('reaction') === 'fine' ? 'fine' : 'loved',
        fromUserId: url.searchParams.get('from'), placedListId: saved.id
      }).catch(() => {});
    }
    redirect(303, `/list/${saved.id}`);
  }
};
