import { error, fail } from '@sveltejs/kit';
import { getItem } from '$lib/server/data.js';
import { saveToTry, removeFromTry, sendRecommendation } from '$lib/server/actions.js';
import { myLibraries, libraryActions } from '$lib/server/libs.js';
import { getBoard, react } from '$lib/server/board.js';
import { streaming, library, libbySearchUrl } from '$lib/server/where.js';

export async function load({ params, platform, locals }) {
  const db = platform.env.DB;
  const data = await getItem(db, params.id);
  if (!data) error(404, 'We could not find that.');
  const me = locals.user.id;
  const [saved, done, people, sent] = await Promise.all([
    db.prepare("SELECT 1 FROM try_items WHERE user_id = ? AND item_id = ? AND status = 'open'").bind(me, params.id).first(),
    db.prepare("SELECT reaction FROM try_items WHERE user_id = ? AND item_id = ? AND status = 'done'").bind(me, params.id).first(),
    db.prepare("SELECT id, name, color FROM users WHERE status = 'active' AND id != ? ORDER BY name").bind(me).all(),
    db.prepare(
      `SELECT r.to_user_id, u.name FROM recommendations r JOIN users u ON u.id = r.to_user_id
        WHERE r.from_user_id = ? AND r.item_id = ? ORDER BY r.created_at`).bind(me, params.id).all()
  ]);
  const item = data.item;
  const libs = await myLibraries(db, me);
  const env = platform.env;
  // Not awaited: the page shows first and this fills in.
  const where = (async () => {
    if (['movie', 'tv'].includes(item.kind)) return { stream: await streaming(db, env, item) };
    if (['book', 'audiobook'].includes(item.kind)) {
      const rows = await library(db, env, item, libs);
      return { libs: rows.map((r) => ({ ...r, search: libbySearchUrl(r.lib.key, item) })) };
    }
    return null;
  })();
  const card = (await getBoard(db, me, { view: 'any', itemId: params.id }))[0] ?? null;
  return { ...data, card, saved: !!saved, done: done?.reaction ?? null, people: people.results, sentTo: sent.results, libs, where, hasTmdb: !!env.TMDB_KEY };
}

export const actions = {
  metoo: async ({ platform, locals, params }) => {
    const db = platform.env.DB;
    const has = await db.prepare('SELECT 1 FROM recs WHERE item_id = ? AND by_user_id = ?').bind(params.id, locals.user.id).first();
    if (!has) await db.prepare('INSERT INTO recs (id, item_id, by_user_id, added_by) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), params.id, locals.user.id, locals.user.id).run();
  },
  react: async ({ request, platform, locals, params }) => {
    const f = await request.formData();
    try { await react(platform.env.DB, locals.user.id, params.id, String(f.get('state')), f.get('reaction') ? String(f.get('reaction')) : null); }
    catch (e) { return fail(400, { error: e.message }); }
  },
  ...libraryActions,
  try: async ({ request, platform, locals, params }) => {
    const f = await request.formData();
    if (f.get('saved') === '1') await removeFromTry(platform.env.DB, locals.user, params.id);
    else await saveToTry(platform.env.DB, locals.user, params.id, f.get('list') || null);
  },
  send: async ({ request, platform, locals, params }) => {
    const db = platform.env.DB;
    const f = await request.formData();
    const to = String(f.get('to') || '');
    const note = String(f.get('note') || '').trim().slice(0, 280);
    const person = await db.prepare("SELECT id, name FROM users WHERE id = ? AND status = 'active'").bind(to).first();
    if (!person || person.id === locals.user.id) return fail(400, { sendError: 'Pick who should try it.' });
    const again = await db.prepare('SELECT 1 FROM recommendations WHERE from_user_id = ? AND to_user_id = ? AND item_id = ?').bind(locals.user.id, to, params.id).first();
    if (again) return fail(400, { sendError: `You already sent this to ${person.name.split(' ')[0]}.` });
    await sendRecommendation(db, locals.user, to, params.id, note);
    return { sentName: person.name.split(' ')[0] };
  }
};
