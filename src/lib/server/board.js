// The shared board: every "you should try" recommendation, ranked.
// Each person's board is everything except what they've finished or hidden.
// Starring something pins it to the top of your own board (private, no effect on scores).
//
// Points: +3 per person recommending it, +2 per "loved it", +1 per "liked it",
// -1 per "not for me" (private, and never below a fresh recommendation's 3).
// Score = points / (days since the newest recommendation + 7).
// For each viewer the score is then nudged by taste match (0.75x to 1.5x),
// but only with people they share enough reactions with.

export const KINDS = {
  book: 'Book', audiobook: 'Audiobook', movie: 'Movie', tv: 'TV show', podcast: 'Podcast',
  restaurant: 'Restaurant', recipe: 'Recipe', place: 'Place to go', other: 'Other'
};
export const KIND_PLURAL = {
  book: 'Books', audiobook: 'Audiobooks', movie: 'Movies', tv: 'TV', podcast: 'Podcasts',
  restaurant: 'Restaurants', recipe: 'Recipes', place: 'Places', other: 'Other'
};
const VALUE = { loved: 2, liked: 1, not_for_me: -2 };

const days = (iso) => Math.max(0, (Date.now() - Date.parse(iso.replace(' ', 'T') + 'Z')) / 864e5);

async function setting(db, key, fallback) {
  const r = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return r ? r.value : fallback;
}

/** How each other member's taste lines up with mine: -1..1, only with enough overlap. */
export async function tasteMatches(db, me, realm = 'main') {
  const min = Number(await setting(db, 'match_min_shared', '5')) || 5;
  // Reactions, plus "I recommended it" counting as loved.
  const rows = (await db.prepare(
    `SELECT user_id, item_id, reaction FROM reactions WHERE reaction IS NOT NULL
     UNION ALL
     SELECT r.by_user_id AS user_id, r.item_id, 'loved' AS reaction FROM recs r WHERE r.by_user_id IS NOT NULL AND r.realm_id = ?`)
    .bind(realm).all()).results;
  const by = {};
  for (const r of rows) (by[r.user_id] ??= {})[r.item_id] = Math.max(by[r.user_id]?.[r.item_id] ?? -9, VALUE[r.reaction]);
  const mine = by[me] || {};
  const out = {};
  for (const [uid, theirs] of Object.entries(by)) {
    if (uid === me) continue;
    const shared = Object.keys(theirs).filter((k) => k in mine);
    if (shared.length < min) continue;
    let dot = 0, a = 0, b = 0;
    for (const k of shared) { dot += mine[k] * theirs[k]; a += mine[k] ** 2; b += theirs[k] ** 2; }
    out[uid] = { score: a && b ? dot / Math.sqrt(a * b) : 0, shared: shared.length };
  }
  return out;
}

/**
 * Cards for the board. opts: { kind, person ('u:<id>' | 'g:<id>'), days, sort ('best'|'new'|'loved'), view ('board'|'saved'|'done'|'hidden') }
 */
export async function getBoard(db, me, opts = {}) {
  const realm = 'main';
  const recs = (await db.prepare(
    `SELECT r.id, r.item_id, r.note, r.created_at, r.by_user_id, r.by_guest_id, r.added_by,
            COALESCE(u.name, g.name) AS by_name, u.color AS by_color, a.name AS added_name
     FROM recs r
     LEFT JOIN users u ON u.id = r.by_user_id
     LEFT JOIN guests g ON g.id = r.by_guest_id
     LEFT JOIN users a ON a.id = r.added_by
     WHERE r.realm_id = ? ORDER BY r.created_at DESC`).bind(realm).all()).results;
  if (!recs.length) return [];
  const ids = [...new Set(recs.map((r) => r.item_id))];
  const ph = ids.map(() => '?').join(',');
  const [items, reacts] = await Promise.all([
    db.prepare(`SELECT id, kind, title, creator, year, narrator, city, url, image_url FROM items WHERE id IN (${ph})`).bind(...ids).all(),
    db.prepare(`SELECT x.user_id, x.item_id, x.state, x.reaction, u.name FROM reactions x JOIN users u ON u.id = x.user_id WHERE x.item_id IN (${ph})`).bind(...ids).all()
  ]);
  const matches = await tasteMatches(db, me, realm);

  const cards = new Map();
  for (const it of items.results) cards.set(it.id, { item: it, recs: [], loved: [], liked: [], notForMe: 0, mine: null });
  for (const r of recs) cards.get(r.item_id)?.recs.push(r);
  for (const x of reacts.results) {
    const c = cards.get(x.item_id);
    if (!c) continue;
    if (x.user_id === me) c.mine = { state: x.state, reaction: x.reaction };
    if (x.reaction === 'loved') c.loved.push({ id: x.user_id, name: x.name });
    else if (x.reaction === 'liked') c.liked.push({ id: x.user_id, name: x.name });
    else if (x.reaction === 'not_for_me') c.notForMe++;
  }

  const out = [];
  for (const c of cards.values()) {
    // One recommendation per person counts toward points
    const people = new Set(c.recs.map((r) => r.by_user_id ? `u:${r.by_user_id}` : `g:${r.by_guest_id}`));
    const pos = 3 * people.size + 2 * c.loved.length + c.liked.length;
    const points = Math.max(3, pos - c.notForMe);
    c.newest = c.recs[0].created_at;
    c.age = days(c.newest);
    c.base = points / (c.age + 7);

    // Taste nudge from members behind it (recommenders count as loving it)
    const voices = [
      ...c.recs.filter((r) => r.by_user_id).map((r) => ({ id: r.by_user_id, w: 2 })),
      ...c.loved.map((l) => ({ id: l.id, w: 2 })),
      ...c.liked.map((l) => ({ id: l.id, w: 1 }))
    ].filter((v) => v.id !== me && matches[v.id]);
    let mult = 1;
    if (voices.length) {
      const wsum = voices.reduce((s, v) => s + v.w, 0);
      const m = voices.reduce((s, v) => s + v.w * matches[v.id].score, 0) / wsum;
      mult = Math.min(1.5, Math.max(0.75, 1 + 0.5 * m));
    }
    c.score = c.base * mult;
    c.boost = mult;
    c.people = [...people];
    c.lovedCount = c.loved.length;
    out.push(c);
  }

  // Filters
  const view = opts.view || 'board';
  let list = out.filter((c) => {
    const st = c.mine?.state;
    if (view === 'any') return true;
    if (view === 'board') return st !== 'hidden' && st !== 'done';
    return st === view;
  });
  if (opts.itemId) list = list.filter((c) => c.item.id === opts.itemId);
  if (opts.kind) list = list.filter((c) => c.item.kind === opts.kind || (opts.kind === 'book' && c.item.kind === 'audiobook'));
  if (opts.person) list = list.filter((c) => c.people.includes(opts.person));
  if (opts.days) list = list.filter((c) => c.recs.some((r) => days(r.created_at) <= opts.days));

  const sort = opts.sort || 'best';
  if (sort === 'new') list.sort((a, b) => a.age - b.age);
  else if (sort === 'loved') list.sort((a, b) => b.lovedCount - a.lovedCount || b.score - a.score);
  else list.sort((a, b) => b.score - a.score);
  // Your starred ones always go first (only for you)
  const st = (c) => (c.mine?.state === 'starred' ? 1 : 0);
  list.sort((a, b) => st(b) - st(a));

  // Trim what goes to the page
  return list.map((c) => ({
    item: c.item,
    recs: c.recs.map((r) => ({ id: r.id, by_user_id: r.by_user_id, by_guest_id: r.by_guest_id, by_name: r.by_name, by_color: r.by_color, note: r.note, created_at: r.created_at, added_name: r.added_by !== r.by_user_id ? r.added_name : null })),
    loved: c.loved.map((l) => l.name),
    liked: c.liked.map((l) => l.name),
    mine: c.mine,
    newest: c.newest,
    boosted: c.boost > 1.05
  }));
}

/** People to filter by: members and non-member recommenders who have recommended something. */
export async function boardPeople(db) {
  return (await db.prepare(
    `SELECT 'u:' || u.id AS key, u.name, u.how_known, COUNT(*) AS n FROM recs r JOIN users u ON u.id = r.by_user_id GROUP BY u.id
     UNION ALL
     SELECT 'g:' || g.id AS key, g.name, 'Not on here yet' AS how_known, COUNT(*) AS n FROM recs r JOIN guests g ON g.id = r.by_guest_id GROUP BY g.id
     ORDER BY name`).all()).results;
}

export async function react(db, me, itemId, state, reaction = null) {
  if (state === 'clear') {
    await db.prepare('DELETE FROM reactions WHERE user_id = ? AND item_id = ?').bind(me, itemId).run();
    return;
  }
  if (!['hidden', 'done', 'starred'].includes(state)) throw new Error('Unknown choice.');
  if (reaction && !VALUE[reaction]) throw new Error('Unknown rating.');
  await db.prepare(
    `INSERT INTO reactions (user_id, item_id, state, reaction) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, item_id) DO UPDATE SET state = excluded.state,
       reaction = COALESCE(excluded.reaction, CASE WHEN excluded.state = 'done' THEN reactions.reaction ELSE reactions.reaction END),
       updated_at = datetime('now')`).bind(me, itemId, state, reaction).run();
}

/** Who already has each of these items on the board. */
export async function onBoard(db, ids) {
  ids = [...new Set(ids.filter(Boolean))];
  if (!ids.length) return {};
  const rows = (await db.prepare(
    `SELECT r.item_id, r.by_user_id, r.by_guest_id, COALESCE(u.name, g.name) AS name, r.created_at
     FROM recs r LEFT JOIN users u ON u.id = r.by_user_id LEFT JOIN guests g ON g.id = r.by_guest_id
     WHERE r.item_id IN (${ids.map(() => '?').join(',')}) ORDER BY r.created_at`).bind(...ids).all()).results;
  const out = {};
  for (const r of rows) (out[r.item_id] ??= []).push({ name: r.name, user: r.by_user_id, guest: r.by_guest_id, at: r.created_at });
  return out;
}
