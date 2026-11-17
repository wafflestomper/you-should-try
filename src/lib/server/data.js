// Database reads for the pages. Kept in one place so later slices can reuse them.

export const KIND = {
  book: 'Book', audiobook: 'Audiobook', movie: 'Movie', tv: 'TV show',
  restaurant: 'Restaurant', recipe: 'Recipe', mixed: 'Mixed'
};

export function subtitle(list) {
  return 'Top 10 ' + (list.category_name || list.custom_subtitle || '');
}

const all = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;

/** Every ranked entry, grouped by person. Small enough to load whole for a friends-sized site. */
async function rankingsByUser(db) {
  const rows = await all(db,
    `SELECT l.owner_id, e.item_id, MIN(e.position) AS pos
       FROM list_entries e JOIN lists l ON l.id = e.list_id
       JOIN users u ON u.id = l.owner_id AND u.status = 'active'
      GROUP BY l.owner_id, e.item_id`);
  const by = {};
  for (const r of rows) (by[r.owner_id] ||= {})[r.item_id] = r.pos;
  return by;
}

const weight = (pos) => (pos <= 10 ? 11 - pos : 0.5);

/** Rank-weighted taste match. Null until two people share at least 3 titles. */
export function tasteMatch(a = {}, b = {}) {
  let dot = 0, na = 0, nb = 0;
  const shared = [];
  for (const k in a) {
    const wa = weight(a[k]);
    na += wa * wa;
    if (b[k] != null) { dot += wa * weight(b[k]); shared.push(k); }
  }
  for (const k in b) nb += weight(b[k]) ** 2;
  if (shared.length < 3 || !na || !nb) return { pct: null, shared };
  shared.sort((x, y) => weight(a[y]) * weight(b[y]) - weight(a[x]) * weight(b[x]));
  return { pct: Math.round(100 * Math.sqrt(dot / Math.sqrt(na * nb))), shared };
}

export async function listsWithTop(db, where = '', args = [], limit = 50) {
  const lists = await all(db,
    `SELECT l.*, c.name AS category_name, u.name AS owner_name, u.color AS owner_color,
            (SELECT COUNT(*) FROM list_entries e WHERE e.list_id = l.id AND e.position <= 10) AS ranked
       FROM lists l
       LEFT JOIN categories c ON c.id = l.category_id
       JOIN users u ON u.id = l.owner_id AND u.status = 'active'
       ${where}
      ORDER BY l.updated_at DESC LIMIT ${limit}`, ...args);
  if (!lists.length) return [];
  const ids = lists.map((l) => l.id);
  const marks = ids.map(() => '?').join(',');
  const entries = await all(db,
    `SELECT e.list_id, e.position, e.why, e.dish, i.id, i.title, i.kind, i.creator, i.image_url
       FROM list_entries e JOIN items i ON i.id = e.item_id
      WHERE e.list_id IN (${marks}) AND e.position <= 3 ORDER BY e.position`, ...ids);
  const tags = await all(db, `SELECT * FROM list_tags WHERE list_id IN (${marks})`, ...ids);
  for (const l of lists) {
    l.subtitle = subtitle(l);
    l.top = entries.filter((e) => e.list_id === l.id);
    l.tags = tags.filter((t) => t.list_id === l.id).map((t) => t.tag);
  }
  return lists;
}

export async function getHome(db, me) {
  const [board, feed, tryList, categories, users, ranks] = await Promise.all([
    listsWithTop(db, 'WHERE l.owner_id != ?', [me.id], 3),
    all(db,
      `SELECT n.*, a.name AS actor_name, a.color AS actor_color, i.title AS item_title, i.kind AS item_kind,
              l.title AS list_title, r.note AS rec_note
         FROM notifications n
         LEFT JOIN users a ON a.id = n.actor_id
         LEFT JOIN items i ON i.id = n.item_id
         LEFT JOIN lists l ON l.id = n.list_id
         LEFT JOIN recommendations r ON r.id = json_extract(n.data, '$.rec')
        WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 12`, me.id),
    getTryList(db, me.id),
    all(db,
      `SELECT c.*, (SELECT COUNT(*) FROM lists l WHERE l.category_id = c.id) AS n
         FROM categories c ORDER BY c.sort`),
    all(db, "SELECT id, name, color FROM users WHERE status = 'active'"),
    rankingsByUser(db)
  ]);
  const twins = users
    .filter((u) => u.id !== me.id)
    .map((u) => ({ ...u, ...tasteMatch(ranks[me.id], ranks[u.id]) }))
    .filter((u) => u.pct != null)
    .sort((a, b) => b.pct - a.pct);
  // Something different: the top pick of the person least like you that you haven't ranked or saved
  let different = null;
  const far = [...twins].reverse()[0];
  if (far) {
    const mine = new Set([...Object.keys(ranks[me.id] || {}), ...tryList.map((t) => t.item_id)]);
    const theirs = Object.entries(ranks[far.id] || {}).sort((a, b) => a[1] - b[1]).find(([id]) => !mine.has(id));
    if (theirs) {
      const item = await db.prepare('SELECT * FROM items WHERE id = ?').bind(theirs[0]).first();
      different = { item, rank: theirs[1], person: far };
    }
  }
  for (const n of feed) n.data = n.data ? JSON.parse(n.data) : {};
  return { board, feed, tryList, categories, twins: twins.slice(0, 4), different };
}

export async function getTryList(db, uid) {
  return all(db,
    `SELECT t.*, i.title, i.kind, i.creator, i.narrator, i.image_url, u.name AS from_name, u.color AS from_color,
            l.title AS from_list_title, e.dish
       FROM try_items t JOIN items i ON i.id = t.item_id
       LEFT JOIN users u ON u.id = t.from_user_id
       LEFT JOIN lists l ON l.id = t.from_list_id
       LEFT JOIN list_entries e ON e.list_id = t.from_list_id AND e.item_id = t.item_id
      WHERE t.user_id = ? AND t.status = 'open' ORDER BY t.added_at DESC`, uid);
}

export async function getList(db, id, me) {
  const list = await db.prepare(
    `SELECT l.*, c.name AS category_name, u.name AS owner_name, u.color AS owner_color
       FROM lists l LEFT JOIN categories c ON c.id = l.category_id JOIN users u ON u.id = l.owner_id
      WHERE l.id = ?`).bind(id).first();
  if (!list) return null;
  list.subtitle = subtitle(list);
  const [entries, tags, saved, ranks] = await Promise.all([
    all(db,
      `SELECT e.*, i.title, i.kind, i.creator, i.year, i.narrator, i.image_url,
              (SELECT COUNT(DISTINCT e2.list_id) FROM list_entries e2 WHERE e2.item_id = i.id) AS on_lists
         FROM list_entries e JOIN items i ON i.id = e.item_id
        WHERE e.list_id = ? ORDER BY e.position`, id),
    all(db, 'SELECT tag FROM list_tags WHERE list_id = ?', id),
    all(db, 'SELECT item_id FROM try_items WHERE user_id = ?', me.id),
    rankingsByUser(db)
  ]);
  const savedSet = new Set(saved.map((s) => s.item_id));
  for (const e of entries) e.saved = savedSet.has(e.item_id);
  return {
    list,
    top: entries.filter((e) => e.position <= 10),
    bench: entries.filter((e) => e.position > 10),
    tags: tags.map((t) => t.tag),
    match: list.owner_id === me.id ? null : tasteMatch(ranks[me.id], ranks[list.owner_id]).pct
  };
}

export async function getCategory(db, id) {
  const category = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();
  if (!category) return null;
  const lists = await listsWithTop(db, 'WHERE l.category_id = ?', [id], 100);
  const consensus = await all(db,
    `SELECT i.id, i.title, i.kind, i.creator, i.narrator, i.image_url,
            SUM(CASE WHEN e.position <= 10 THEN 11 - e.position ELSE 0 END) AS pts,
            COUNT(*) AS lists
       FROM list_entries e JOIN lists l ON l.id = e.list_id JOIN items i ON i.id = e.item_id
       JOIN users u ON u.id = l.owner_id AND u.status = 'active'
      WHERE l.category_id = ? GROUP BY i.id ORDER BY pts DESC, lists DESC LIMIT 10`, id);
  return { category, lists, consensus };
}

export async function getItem(db, id) {
  const item = await db.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
  if (!item) return null;
  const [rankedOn, tags, dishes] = await Promise.all([
    all(db,
      `SELECT e.position, e.why, e.dish, l.id AS list_id, l.title AS list_title, u.id AS user_id, u.name AS user_name, u.color AS user_color
         FROM list_entries e JOIN lists l ON l.id = e.list_id JOIN users u ON u.id = l.owner_id AND u.status = 'active'
        WHERE e.item_id = ? ORDER BY e.position`, id),
    all(db,
      `SELECT DISTINCT m.tag FROM item_tags t JOIN tag_map m ON m.label = lower(t.label) WHERE t.item_id = ?`, id),
    all(db,
      `SELECT dish, COUNT(*) AS n FROM list_entries WHERE item_id = ? AND dish IS NOT NULL GROUP BY dish ORDER BY n DESC`, id)
  ]);
  return { item, rankedOn, tags: tags.map((t) => t.tag), dishes };
}
