import { error, fail } from '@sveltejs/kit';
import { getItem } from '$lib/server/data.js';
import { saveToTry, removeFromTry, sendRecommendation } from '$lib/server/actions.js';
import { myLibraries, libraryActions } from '$lib/server/libs.js';
import { getBoard, react, KINDS } from '$lib/server/board.js';
import { mergeItems } from '$lib/server/dups.js';
import { ensureItem } from '$lib/server/lists.js';
import { redirect } from '@sveltejs/kit';

export async function load({ params, platform, locals }) {
  const db = platform.env.DB;
  const data = await getItem(db, params.id);
  if (!data) error(404, 'We could not find that.');
  const me = locals.user.id;
  // Opening a pick counts as seeing it on the board
  const seenNow = db.prepare("INSERT INTO board_seen (user_id, item_id) VALUES (?, ?) ON CONFLICT (user_id, item_id) DO UPDATE SET seen_at = datetime('now')").bind(me, params.id).run().catch(() => {});
  (platform.context?.waitUntil ?? platform.ctx?.waitUntil)?.call(platform.context ?? platform.ctx, seenNow);
  const [saved, done, people, sent] = await Promise.all([
    db.prepare("SELECT 1 FROM try_items WHERE user_id = ? AND item_id = ? AND status = 'open'").bind(me, params.id).first(),
    db.prepare("SELECT reaction FROM try_items WHERE user_id = ? AND item_id = ? AND status = 'done'").bind(me, params.id).first(),
    db.prepare("SELECT id, name, color FROM users WHERE status = 'active' AND id != ? ORDER BY name").bind(me).all(),
    db.prepare(
      `SELECT r.to_user_id, u.name FROM recommendations r JOIN users u ON u.id = r.to_user_id
        WHERE r.from_user_id = ? AND r.item_id = ? ORDER BY r.created_at`).bind(me, params.id).all()
  ]);
  const env = platform.env;
  // Everything here comes from our own database, asked all at once. Streaming and library
  // lookups (outside services, sometimes slow) are fetched by the page after it opens.
  const [libs, detailsBy, cards, mine] = await Promise.all([
    myLibraries(db, me),
    data.item.details_by ? db.prepare('SELECT name FROM users WHERE id = ?').bind(data.item.details_by).first() : null,
    getBoard(db, me, { view: 'any', itemId: params.id }),
    db.prepare('SELECT COUNT(*) AS n FROM recs WHERE item_id = ? AND (added_by = ? OR by_user_id = ?)').bind(params.id, me, me).first()
  ]);
  const card = cards[0] ?? null;
  const mineRecs = mine.n;
  const canFix = mineRecs > 0 || !!locals.realUser?.is_admin;
  return { ...data, card, canFix, mineRecs, isAdmin: !!locals.realUser?.is_admin, detailsBy: detailsBy?.name ?? null, saved: !!saved, done: done?.reaction ?? null, people: people.results, sentTo: sent.results, libs, hasTmdb: !!env.TMDB_KEY };
}

export const actions = {
  removeMine: async ({ platform, locals, params }) => {
    const db = platform.env.DB;
    await db.prepare('DELETE FROM recs WHERE item_id = ? AND (added_by = ? OR by_user_id = ?)').bind(params.id, locals.user.id, locals.user.id).run();
    const left = await db.prepare('SELECT COUNT(*) AS n FROM recs WHERE item_id = ?').bind(params.id).first();
    redirect(303, left.n ? `/item/${params.id}` : '/?removed=1');
  },
  deleteCard: async ({ platform, locals, params }) => {
    if (!locals.realUser?.is_admin) return fail(403, { fixError: 'Only an admin can delete a card for everyone.' });
    const db = platform.env.DB;
    await db.batch([
      db.prepare('DELETE FROM recs WHERE item_id = ?').bind(params.id),
      db.prepare('DELETE FROM reactions WHERE item_id = ?').bind(params.id)
    ]);
    redirect(303, '/?removed=1');
  },
  fix: async ({ request, platform, locals, params }) => {
    const db = platform.env.DB;
    const allowed = locals.realUser?.is_admin || (await db.prepare('SELECT 1 FROM recs WHERE item_id = ? AND (added_by = ? OR by_user_id = ?)').bind(params.id, locals.user.id, locals.user.id).first());
    if (!allowed) return fail(403, { fixError: 'Only the person who added this (or an admin) can change it.' });
    const f = await request.formData();
    const kind = String(f.get('kind') || '');
    const title = String(f.get('title') || '').trim();
    let pick = {};
    try { pick = JSON.parse(String(f.get('pick') || '{}')); } catch {}
    if (!KINDS[kind]) return fail(400, { fixError: 'Pick what kind of thing it is.' });
    if (!title && !pick.title) return fail(400, { fixError: 'Add the title.' });
    const cur = await db.prepare('SELECT * FROM items WHERE id = ?').bind(params.id).first();
    let toId;
    if (pick.title) {
      toId = await ensureItem(db, { ...pick, kind: pick.kind === 'audiobook' && kind === 'book' ? 'audiobook' : kind });
    } else if (cur.source === 'manual') {
      // Typed-in thing: just correct it in place
      await db.prepare('UPDATE items SET kind = ?, title = ?, image_url = CASE WHEN title = ? THEN image_url ELSE NULL END, cover_checked_at = NULL WHERE id = ?').bind(kind, title, title, params.id).run();
      toId = params.id;
    } else {
      toId = await ensureItem(db, { kind, title });
    }
    if (toId !== params.id) await mergeItems(db, locals.user.id, params.id, toId);
    redirect(303, `/item/${toId}?fixed=1`);
  },
  details: async ({ request, platform, locals, params }) => {
    const f = await request.formData();
    let link = String(f.get('link') || '').trim();
    if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
    try { link = link ? new URL(link).href : null; } catch { return fail(400, { detailsError: "That link doesn't look right. Paste the whole web address." }); }
    const details = String(f.get('details') || '').trim().slice(0, 8000) || null;
    await platform.env.DB.prepare("UPDATE items SET url = ?, details = ?, details_by = ?, details_at = datetime('now') WHERE id = ?")
      .bind(link, details, locals.user.id, params.id).run();
    return { detailsSaved: true };
  },
  metoo: async ({ platform, locals, params }) => {
    const db = platform.env.DB;
    const has = await db.prepare('SELECT 1 FROM recs WHERE item_id = ? AND by_user_id = ?').bind(params.id, locals.user.id).first();
    if (!has) await db.prepare('INSERT INTO recs (id, item_id, by_user_id, added_by) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), params.id, locals.user.id, locals.user.id).run();
  },
  react: async ({ request, platform, locals, params }) => {
    const f = await request.formData();
    try { await react(platform.env.DB, locals.user.id, params.id, String(f.get('state')), f.get('reaction') ? String(f.get('reaction')) : null, f.get('share') === '1'); }
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
