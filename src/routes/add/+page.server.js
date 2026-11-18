import { fail, redirect } from '@sveltejs/kit';
import { ensureItem } from '$lib/server/lists.js';
import { KINDS } from '$lib/server/board.js';

export async function load({ platform }) {
  const db = platform.env.DB;
  const [members, guests] = await Promise.all([
    db.prepare("SELECT id, name FROM users WHERE status = 'active' AND is_guest = 0 ORDER BY name").all(),
    db.prepare('SELECT id, name FROM guests WHERE user_id IS NULL ORDER BY name').all()
  ]);
  return { members: members.results, guests: guests.results, hasVoice: !!platform.env.AI };
}

/** Work out who "Warren" is: a member, someone already named, or someone new. */
async function resolvePerson(db, me, raw) {
  const name = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!name || /^(me|myself|i)$/i.test(name)) return { user: me.id };
  const lc = name.toLowerCase();
  const members = (await db.prepare("SELECT id, name FROM users WHERE status = 'active' AND is_guest = 0").all()).results;
  const exact = members.find((m) => m.name.toLowerCase() === lc);
  if (exact) return { user: exact.id };
  const byFirst = members.filter((m) => m.name.toLowerCase().split(' ')[0] === lc);
  if (byFirst.length === 1) return { user: byFirst[0].id };
  const g = await db.prepare('SELECT id FROM guests WHERE lower(name) = ? AND user_id IS NULL').bind(lc).first();
  if (g) return { guest: g.id };
  const gid = crypto.randomUUID();
  await db.prepare('INSERT INTO guests (id, name, added_by) VALUES (?, ?, ?)').bind(gid, name, me.id).run();
  return { guest: gid, isNew: true };
}

export const actions = {
  save: async ({ request, platform, locals }) => {
    const db = platform.env.DB;
    const f = await request.formData();
    let pick = {};
    try { pick = JSON.parse(String(f.get('pick') || '{}')); } catch {}
    const kind = String(f.get('kind') || '');
    const title = String(f.get('title') || '').trim();
    const note = String(f.get('note') || '').trim().slice(0, 300) || null;
    if (!KINDS[kind]) return fail(400, { error: 'Pick what kind of thing it is.' });
    if (!title && !pick.title) return fail(400, { error: 'Add the title or name.' });

    let itemId;
    try {
      itemId = await ensureItem(db, pick.title ? { ...pick, kind: pick.kind === 'audiobook' && kind === 'book' ? 'audiobook' : kind } : { kind, title, creator: String(f.get('creator') || '') });
    } catch (e) {
      return fail(400, { error: e.message });
    }
    const who = await resolvePerson(db, locals.user, f.get('by'));
    // Same person, same thing: don't double count
    const dup = await db.prepare('SELECT id FROM recs WHERE item_id = ? AND (by_user_id = ? OR by_guest_id = ?)')
      .bind(itemId, who.user ?? '', who.guest ?? '').first();
    if (!dup) {
      await db.prepare('INSERT INTO recs (id, item_id, by_user_id, by_guest_id, added_by, note) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), itemId, who.user ?? null, who.guest ?? null, locals.user.id, note).run();
    }
    redirect(303, `/?added=${itemId}${dup ? '&dup=1' : ''}`);
  }
};
