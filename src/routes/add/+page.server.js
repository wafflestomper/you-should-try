import { fail, redirect } from '@sveltejs/kit';
import { ensureItem } from '$lib/server/lists.js';
import { KINDS } from '$lib/server/board.js';
import { flagIfDup } from '$lib/server/dups.js';

export async function load({ platform, locals }) {
  const db = platform.env.DB;
  const [members, guests] = await Promise.all([
    db.prepare("SELECT id, name FROM users WHERE status = 'active' AND is_guest = 0 ORDER BY name").all(),
    db.prepare('SELECT id, name FROM guests WHERE user_id IS NULL ORDER BY name').all()
  ]);
  return { members: members.results, guests: guests.results, hasVoice: !!platform.env.AI, me: locals.user.name };
}

/** Work out who "Warren" is: a member, someone already named, or someone new. */
async function resolvePerson(db, me, raw) {
  const name = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!name || /^(me|myself|i)$/i.test(name)) return { user: me.id };
  const lc = name.toLowerCase();
  const members = (await db.prepare("SELECT id, name FROM users WHERE status = 'active' AND is_guest = 0").all()).results;
  const exact = members.find((m) => m.name.toLowerCase() === lc)
    || (() => { const [f1, l1] = lc.replace('.', '').split(' '); if (!l1) return null; const hits = members.filter((m) => { const [f2, ...rest] = m.name.toLowerCase().split(' '); return f2 === f1 && rest.join(' ').startsWith(l1); }); return hits.length === 1 ? hits[0] : null; })();
  if (exact) return { user: exact.id };
  const g = await db.prepare('SELECT id FROM guests WHERE lower(name) = ? AND user_id IS NULL').bind(lc).first();
  if (g) return { guest: g.id };
  const byFirst = members.filter((m) => m.name.toLowerCase().split(' ')[0] === lc);
  if (byFirst.length === 1) return { user: byFirst[0].id };
  if (byFirst.length > 1) return { ambiguous: byFirst.map((m) => m.name) };
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
    let link = String(f.get('link') || '').trim();
    if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
    try { link = link ? new URL(link).href : null; } catch { return fail(400, { error: "That link doesn't look right. Paste the whole web address." }); }
    if (!KINDS[kind]) return fail(400, { error: 'Pick what kind of thing it is.' });
    if (!title && !pick.title) return fail(400, { error: 'Add the title or name.' });

    let itemId;
    try {
      itemId = await ensureItem(db, pick.title ? { ...pick, kind: pick.kind === 'audiobook' && kind === 'book' ? 'audiobook' : kind, url: link || pick.url } : { kind, title, creator: String(f.get('creator') || ''), url: link });
      if (link) await db.prepare('UPDATE items SET url = ? WHERE id = ? AND url IS NULL').bind(link, itemId).run();
    } catch (e) {
      return fail(400, { error: e.message });
    }
    const mode = String(f.get('mode') || 'someone');
    if (mode === 'mine') {
      // Only on my board until I try it
      await db.prepare(`INSERT INTO reactions (user_id, item_id, state) VALUES (?, ?, 'wanted')
        ON CONFLICT (user_id, item_id) DO UPDATE SET state = CASE WHEN reactions.state IN ('done','hidden') THEN reactions.state ELSE 'wanted' END, updated_at = datetime('now')`)
        .bind(locals.user.id, itemId).run();
      redirect(303, `/?added=${itemId}&how=mine`);
    }
    const who = await resolvePerson(db, locals.user, mode === 'me' ? '' : f.get('by'));
    if (who.ambiguous) return fail(400, { error: `There's more than one ${String(f.get('by')).trim()} on here (${who.ambiguous.join(', ')}). Type the last name too.` });
    // Same person, same thing: don't double count
    const dup = await db.prepare('SELECT id FROM recs WHERE item_id = ? AND (by_user_id = ? OR by_guest_id = ?)')
      .bind(itemId, who.user ?? '', who.guest ?? '').first();
    const before = await db.prepare('SELECT COUNT(*) AS n FROM recs WHERE item_id = ?').bind(itemId).first();
    if (!dup) {
      await db.prepare('INSERT INTO recs (id, item_id, by_user_id, by_guest_id, added_by, note) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), itemId, who.user ?? null, who.guest ?? null, locals.user.id, note).run();
      if (!before.n) await flagIfDup(db, locals.user.id, itemId).catch(() => {});
      else if (who.user) {
        const earlier = (await db.prepare('SELECT DISTINCT by_user_id FROM recs WHERE item_id = ? AND by_user_id IS NOT NULL AND by_user_id != ?').bind(itemId, who.user).all()).results;
        if (earlier.length) await db.batch(earlier.map((o) => db.prepare(
          `INSERT INTO notifications (id, user_id, type, actor_id, item_id) VALUES (?, ?, 'joined_your_pick', ?, ?)`).bind(crypto.randomUUID(), o.by_user_id, who.user, itemId)));
      }
    } else if (note) {
      // Same person again: keep their newest note
      await db.prepare('UPDATE recs SET note = ? WHERE id = ?').bind(note, dup.id).run();
    }
    redirect(303, `/?added=${itemId}&how=${dup ? 'dup' : before.n ? 'joined' : 'new'}${who.guest ? `&guest=${who.guest}` : ''}`);
  }
};
