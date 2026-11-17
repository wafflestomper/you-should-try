import { error, fail, redirect } from '@sveltejs/kit';
import { finishItem } from '$lib/server/actions.js';

export async function load({ params, platform, locals, url }) {
  const db = platform.env.DB;
  const me = locals.user;
  const item = await db.prepare('SELECT * FROM items WHERE id = ?').bind(params.item).first();
  if (!item) error(404, 'We could not find that.');

  const row = await db.prepare(
    `SELECT t.from_user_id, t.from_rank, t.status, t.reaction, u.name AS from_name, u.color AS from_color
     FROM try_items t LEFT JOIN users u ON u.id = t.from_user_id WHERE t.user_id = ? AND t.item_id = ?`)
    .bind(me.id, item.id).first();
  let from = row?.from_user_id ? { id: row.from_user_id, name: row.from_name, color: row.from_color, rank: row.from_rank } : null;
  const fromParam = url.searchParams.get('from');
  if (!from && fromParam) {
    const u = await db.prepare('SELECT id, name, color FROM users WHERE id = ?').bind(fromParam).first();
    if (u) from = { ...u, rank: null };
  }

  // Your lists that could hold this: same kind, or mixed lists for restaurants and recipes.
  const kinds = ['restaurant', 'recipe'].includes(item.kind) ? [item.kind, 'mixed'] : [item.kind];
  const lists = (await db.prepare(
    `SELECT l.id, l.title, l.kind, c.name AS cat_name, l.custom_subtitle,
            (SELECT COUNT(*) FROM list_entries e WHERE e.list_id = l.id AND e.position <= 10) AS n,
            EXISTS (SELECT 1 FROM list_entries e WHERE e.list_id = l.id AND e.item_id = ?) AS has_it
     FROM lists l LEFT JOIN categories c ON c.id = l.category_id
     WHERE l.owner_id = ? AND l.kind IN (${kinds.map(() => '?').join(',')})
     ORDER BY l.updated_at DESC`).bind(item.id, me.id, ...kinds).all()).results;

  const entries = lists.length
    ? (await db.prepare(
        `SELECT e.list_id, e.position, i.id, i.title, i.kind, i.creator, i.year, i.image_url
         FROM list_entries e JOIN items i ON i.id = e.item_id
         WHERE e.position <= 10 AND e.list_id IN (${lists.map(() => '?').join(',')}) ORDER BY e.position`)
        .bind(...lists.map((l) => l.id)).all()).results
    : [];
  for (const l of lists) {
    l.subtitle = l.cat_name ? `Top 10 ${l.cat_name}` : l.custom_subtitle ? `Top 10 ${l.custom_subtitle}` : '';
    l.top = entries.filter((e) => e.list_id === l.id).map((e) => ({ item: { id: e.id, title: e.title, kind: e.kind, creator: e.creator, year: e.year, image_url: e.image_url } }));
  }
  return { item, from, lists, status: row?.status ?? null };
}

export const actions = {
  place: async ({ request, platform, locals, params, url }) => {
    const f = await request.formData();
    const reaction = String(f.get('reaction') || 'loved');
    const listId = f.get('list') ? String(f.get('list')) : null;
    const index = f.get('index') !== null && f.get('index') !== '' ? Number(f.get('index')) : null;
    let rank;
    try {
      ({ rank } = await finishItem(platform.env.DB, locals.user, params.item, {
        reaction, listId, index, fromUserId: url.searchParams.get('from')
      }));
    } catch (e) {
      return fail(400, { error: e.message });
    }
    if (listId) redirect(303, `/list/${listId}?added=${params.item}`);
    redirect(303, `/try?done=${params.item}&r=${reaction}`);
  }
};
