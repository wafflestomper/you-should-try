import { fail } from '@sveltejs/kit';
import { getBoard, boardPeople, react, KINDS } from '$lib/server/board.js';
import { fillCovers } from '$lib/server/covers.js';
import { warmWhere } from '$lib/server/where.js';
import { myLibraries } from '$lib/server/libs.js';
import { groupsOf } from '$lib/groups.js';
import { facetSome } from '$lib/server/facets.js';
import { GENRES, MOODS } from '$lib/facetTags.js';

export async function load({ platform, locals, url }) {
  const db = platform.env.DB;
  // Missing covers get looked up in the background; they appear on the next visit.
  const job = fillCovers(db, platform.env).catch(() => {});
  if (platform.context?.waitUntil) platform.context.waitUntil(job); else if (platform.ctx?.waitUntil) platform.ctx.waitUntil(job);
  const q = url.searchParams;
  const opts = {
    kind: KINDS[q.get('kind')] ? q.get('kind') : null,
    person: q.get('person') || null,
    days: Number(q.get('days')) || null,
    sort: ['best', 'new', 'loved', 'type'].includes(q.get('sort')) ? q.get('sort') : 'type' // the board starts grouped by type
  };
  // A saved filter (?f=<id>) sets several people and types at once
  const [saved, members] = await Promise.all([
    db.prepare('SELECT id, name, people, kinds, via FROM saved_filters WHERE user_id = ? ORDER BY name').bind(locals.user.id).all(),
    db.prepare("SELECT id, how_known FROM users WHERE status = 'active' AND how_known IS NOT NULL AND how_known != ''").all()
  ]);
  // Every group (St. Chris, Tennis…) is a ready-made filter, kept up to date as people join it
  const groups = new Map();
  for (const m of members.results) for (const g of groupsOf(m.how_known)) (groups.get(g) ?? groups.set(g, []).get(g)).push(m.id);
  const groupList = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([name, ids]) => ({ name, size: ids.length }));
  const filters = saved.results.map((f) => ({ ...f, people: JSON.parse(f.people), kinds: JSON.parse(f.kinds), via: !!f.via }));
  let active = filters.find((f) => f.id === q.get('f')) ?? null;
  // ?g=St. Chris&g=Tennis: picks from everyone in any of those groups
  const picked = [...new Set(q.getAll('g'))].filter((g) => groups.has(g));
  if (!active && picked.length) {
    const ids = new Set(picked.flatMap((g) => groups.get(g)));
    const others = [...ids].filter((id) => id !== locals.user.id).map((id) => `u:${id}`);
    // A group with nobody else in it yet shows an empty board, not everyone
    active = { id: 'groups', group: true, names: picked, size: ids.size, counted: ids.has(locals.user.id), people: others.length ? others : ['u:-nobody-'], kinds: [], via: false };
  }
  if (active) Object.assign(opts, { people: active.people, kinds: active.kinds, via: active.via, filter: active.id });
  const [allCards, people, facetRows] = await Promise.all([getBoard(db, locals.user.id, opts), boardPeople(db),
    db.prepare('SELECT item_id, type, tag FROM item_facets WHERE item_id IN (SELECT item_id FROM recs UNION SELECT item_id FROM reactions WHERE user_id = ?)').bind(locals.user.id).all()]);
  // Genres and moods: ?t=Thriller&t=Funny. Any picked genre AND any picked mood (when both kinds are picked).
  const facetsOf = new Map();
  for (const r of facetRows.results) (facetsOf.get(r.item_id) ?? facetsOf.set(r.item_id, { genre: [], mood: [] }).get(r.item_id))[r.type]?.push(r.tag);
  const tagsOn = [...new Set(q.getAll('t'))].filter((t) => GENRES.includes(t) || MOODS.includes(t));
  const wantG = tagsOn.filter((t) => GENRES.includes(t)), wantM = tagsOn.filter((t) => MOODS.includes(t));
  const counts = new Map();
  for (const c of allCards) { const f = facetsOf.get(c.item.id); if (f) for (const t of [...f.genre, ...f.mood]) counts.set(t, (counts.get(t) ?? 0) + 1); }
  const cards = !tagsOn.length ? allCards : allCards.filter((c) => {
    const f = facetsOf.get(c.item.id) ?? { genre: [], mood: [] };
    return (!wantG.length || wantG.some((t) => f.genre.includes(t))) && (!wantM.length || wantM.some((t) => f.mood.includes(t)));
  });
  for (const c of cards) c.facets = facetsOf.get(c.item.id) ?? null;
  const tagList = { genres: GENRES.filter((t) => counts.has(t) || tagsOn.includes(t)).map((t) => ({ tag: t, n: counts.get(t) ?? 0 })),
    moods: MOODS.filter((t) => counts.has(t) || tagsOn.includes(t)).map((t) => ({ tag: t, n: counts.get(t) ?? 0 })) };
  // In the background: look up where to watch or borrow the top few, so opening them is instant; and tag a few untagged picks
  const warm = Promise.all([
    myLibraries(db, locals.user.id).then((libs) => warmWhere(db, platform.env, libs, cards.slice(0, 12).map((c) => c.item.id))).catch(() => {}),
    facetSome(db, platform.env, 2).catch(() => {})
  ]);
  if (platform.context?.waitUntil) platform.context.waitUntil(warm); else if (platform.ctx?.waitUntil) platform.ctx.waitUntil(warm);
  const added = q.get('added') ? await db.prepare('SELECT title FROM items WHERE id = ?').bind(q.get('added')).first() : null;
  // They credited someone who isn't on the site yet: offer to invite them
  const invitee = q.get('guest') ? await db.prepare(
    `SELECT g.id, g.name, (SELECT COUNT(*) FROM invites i WHERE i.guest_id = g.id AND i.used_by IS NULL AND i.expires_at > datetime('now')) AS invited
       FROM guests g WHERE g.id = ? AND g.user_id IS NULL`).bind(q.get('guest')).first() : null;
  return { cards, people, opts, addedTitle: added?.title ?? null, invitee, filters, active, groups: groupList, tagList, tagsOn };
}

const KEYS = /^[ug]:[\w-]{1,60}$/;
const TYPES = new Set(Object.keys(KINDS));
function readFilter(f) {
  const name = String(f.get('name') || '').trim().slice(0, 40);
  const people = [...new Set(f.getAll('people').map(String).filter((k) => KEYS.test(k)))].slice(0, 40);
  const kinds = [...new Set(f.getAll('kinds').map(String).filter((k) => TYPES.has(k)))];
  return { name, people, kinds, via: f.get('via') === '1' };
}

export const actions = {
  saveFilter: async ({ request, platform, locals }) => {
    const db = platform.env.DB, f = await request.formData();
    const { name, people, kinds, via } = readFilter(f);
    if (!name) return fail(400, { filterError: 'Give the filter a name, like "Three Amigos".' });
    if (!people.length && !kinds.length) return fail(400, { filterError: 'Pick at least one person or one type.' });
    const id = String(f.get('id') || '');
    if (id) {
      await db.prepare("UPDATE saved_filters SET name = ?, people = ?, kinds = ?, via = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
        .bind(name, JSON.stringify(people), JSON.stringify(kinds), via ? 1 : 0, id, locals.user.id).run();
      return { savedFilter: id };
    }
    const nid = crypto.randomUUID();
    await db.prepare('INSERT INTO saved_filters (id, user_id, name, people, kinds, via) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(nid, locals.user.id, name, JSON.stringify(people), JSON.stringify(kinds), via ? 1 : 0).run();
    return { savedFilter: nid };
  },
  deleteFilter: async ({ request, platform, locals }) => {
    const id = String((await request.formData()).get('id') || '');
    await platform.env.DB.prepare('DELETE FROM saved_filters WHERE id = ? AND user_id = ?').bind(id, locals.user.id).run();
    return { deletedFilter: id };
  },
  // Swipe left > Delete: take back what I entered (added it by mistake), or drop a "just for me" pick
  removeMine: async ({ request, platform, locals }) => {
    const db = platform.env.DB, me = locals.user.id;
    const id = String((await request.formData()).get('item') || '');
    const item = await db.prepare('SELECT title FROM items WHERE id = ?').bind(id).first();
    if (!item) return fail(404, { error: 'That card is gone already.' });
    const recs = (await db.prepare('SELECT id, by_user_id, by_guest_id, note, created_at FROM recs WHERE item_id = ? AND added_by = ?').bind(id, me).all()).results;
    const want = await db.prepare("SELECT 1 FROM reactions WHERE user_id = ? AND item_id = ? AND state = 'wanted'").bind(me, id).first();
    await db.batch([
      db.prepare('DELETE FROM recs WHERE item_id = ? AND added_by = ?').bind(id, me),
      db.prepare("DELETE FROM reactions WHERE user_id = ? AND item_id = ? AND state = 'wanted'").bind(me, id)
    ]);
    return { removed: item.title, undo: JSON.stringify({ item: id, recs, want: !!want }) };
  },
  // Put back exactly what Delete took off (only things this person had entered)
  undoRemove: async ({ request, platform, locals }) => {
    const db = platform.env.DB, me = locals.user.id;
    let u; try { u = JSON.parse(String((await request.formData()).get('undo') || '')); } catch { return fail(400, { error: "Couldn't undo that." }); }
    if (!(await db.prepare('SELECT 1 FROM items WHERE id = ?').bind(u.item).first())) return fail(400, { error: "Couldn't undo that." });
    const stmts = (u.recs || []).slice(0, 20).map((r) => db.prepare(
      'INSERT OR IGNORE INTO recs (id, item_id, by_user_id, by_guest_id, added_by, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(String(r.id), u.item, r.by_user_id ?? null, r.by_guest_id ?? null, me, r.note ?? null, r.created_at ?? new Date().toISOString().slice(0, 19).replace('T', ' ')));
    if (u.want) stmts.push(db.prepare("INSERT OR IGNORE INTO reactions (user_id, item_id, state) VALUES (?, ?, 'wanted')").bind(me, u.item));
    if (stmts.length) await db.batch(stmts);
    return { restored: true };
  },
  react: async ({ request, platform, locals }) => {
    const f = await request.formData();
    try {
      await react(platform.env.DB, locals.user.id, String(f.get('item')), String(f.get('state')), f.get('reaction') ? String(f.get('reaction')) : null, f.get('share') === '1');
    } catch (e) {
      return fail(400, { error: e.message });
    }
  }
};
