// Creating and updating lists.
import { normTag, MAX_TAGS } from '$lib/tags.js';
import { itemLabels } from './search.js';

const uid = () => crypto.randomUUID();
const KINDS = ['book', 'audiobook', 'movie', 'tv', 'podcast', 'restaurant', 'recipe', 'place', 'other'];

/** Find or create the item for one entry. Returns its id. */
export async function ensureItem(db, it) {
  if (it.local_id) {
    const found = await db.prepare('SELECT id FROM items WHERE id = ?').bind(it.local_id).first();
    if (found) return found.id;
  }
  if (!KINDS.includes(it.kind)) throw new Error('Unknown kind of item.');
  const title = String(it.title || '').trim().slice(0, 200);
  if (!title) throw new Error('Every item needs a title.');
  if (it.source && it.source_id) {
    const found = await db.prepare('SELECT id FROM items WHERE source = ? AND source_id = ?').bind(it.source, it.source_id).first();
    if (found) return found.id;
  }
  const id = uid();
  const source = it.source || 'manual';
  const sourceId = it.source_id || id;
  await db.prepare(
    `INSERT INTO items (id, kind, title, creator, year, narrator, city, url, image_url, source, source_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, it.kind, title, clip(it.creator, 120), Number(it.year) || null, clip(it.narrator, 120),
      clip(it.city, 80), safeUrl(it.url), safeUrl(it.image_url), source, sourceId).run();
  const labels = [...new Set((it.labels || []).map((l) => String(l).trim()).filter(Boolean))].slice(0, 25);
  if (labels.length) {
    await db.batch(labels.map((l) => db.prepare('INSERT OR IGNORE INTO item_tags (item_id, label) VALUES (?, ?)').bind(id, l.slice(0, 80))));
  }
  return id;
}

const clip = (v, n) => (v == null || v === '' ? null : String(v).trim().slice(0, n));
function safeUrl(v) {
  if (!v) return null;
  try { const u = new URL(String(v)); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null; } catch { return null; }
}

/** Validate and save. Returns { id } or throws an Error with a message for the person. */
export async function saveList(db, me, p, existingId = null) {
  const title = String(p.title || '').trim().slice(0, 80);
  if (!title) throw new Error('Give your list a title.');
  let categoryId = p.category_id || null;
  let kind = p.kind;
  if (categoryId) {
    const cat = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first();
    if (!cat) throw new Error('Pick one of the main top tens, or choose Something else.');
    kind = cat.kind;
  } else {
    if (!String(p.custom_subtitle || '').trim()) throw new Error('Name what you are ranking, or pick a main top ten.');
    if (![...KINDS, 'mixed'].includes(kind)) throw new Error('Pick what kind of thing you are ranking.');
  }
  const entries = Array.isArray(p.entries) ? p.entries.slice(0, 40) : [];
  if (!entries.length) throw new Error('Add at least one thing to your list.');

  const merges = Object.fromEntries((await db.prepare('SELECT alias, canonical FROM tag_merges').all()).results.map((m) => [m.alias, m.canonical]));
  const tags = [...new Set((p.tags || []).map((t) => normTag(t, merges)).filter(Boolean))].slice(0, MAX_TAGS);

  if (existingId) {
    const list = await db.prepare('SELECT owner_id FROM lists WHERE id = ?').bind(existingId).first();
    if (!list || list.owner_id !== me.id) throw new Error('You can only edit your own lists.');
  }

  const itemIds = [];
  for (const e of entries) itemIds.push(await ensureItem(db, e.item || {}));
  if (new Set(itemIds).size !== itemIds.length) throw new Error('The same thing is on the list twice. Remove one of them.');

  const id = existingId || uid();
  const stmts = [];
  if (existingId) {
    stmts.push(db.prepare(
      `UPDATE lists SET category_id = ?, custom_subtitle = ?, kind = ?, title = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(categoryId, categoryId ? null : clip(p.custom_subtitle, 60), kind, title, id));
    stmts.push(db.prepare('DELETE FROM list_entries WHERE list_id = ?').bind(id));
    stmts.push(db.prepare('DELETE FROM list_tags WHERE list_id = ?').bind(id));
  } else {
    stmts.push(db.prepare(
      `INSERT INTO lists (id, owner_id, category_id, custom_subtitle, kind, title) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, me.id, categoryId, categoryId ? null : clip(p.custom_subtitle, 60), kind, title));
  }
  entries.forEach((e, i) => {
    stmts.push(db.prepare('INSERT INTO list_entries (list_id, item_id, position, why, dish) VALUES (?, ?, ?, ?, ?)')
      .bind(id, itemIds[i], i + 1, clip(e.why, 140), clip(e.dish, 60)));
  });
  for (const t of tags) stmts.push(db.prepare('INSERT INTO list_tags (list_id, tag) VALUES (?, ?)').bind(id, t));
  stmts.push(db.prepare('INSERT INTO list_snapshots (list_id, entries) VALUES (?, ?)').bind(id, JSON.stringify(itemIds)));
  await db.batch(stmts);

  if (!existingId) {
    // Let people who share a circle know about the new list
    const people = (await db.prepare(
      `SELECT DISTINCT m2.user_id FROM circle_members m1 JOIN circle_members m2 ON m2.circle_id = m1.circle_id
        JOIN circles c ON c.id = m1.circle_id AND c.status = 'ok'
        WHERE m1.user_id = ? AND m2.user_id != ?`).bind(me.id, me.id).all()).results;
    if (people.length) {
      await db.batch(people.map((u) => db.prepare(
        `INSERT INTO notifications (id, user_id, type, actor_id, list_id) VALUES (?, ?, 'new_list', ?, ?)`).bind(uid(), u.user_id, me.id, id)));
    }
  }
  return { id };
}

/** Load a list in the shape the editor uses. */
export async function listForEditor(db, id) {
  const list = await db.prepare('SELECT * FROM lists WHERE id = ?').bind(id).first();
  if (!list) return null;
  const entries = (await db.prepare(
    `SELECT e.position, e.why, e.dish, i.* FROM list_entries e JOIN items i ON i.id = e.item_id WHERE e.list_id = ? ORDER BY e.position`)
    .bind(id).all()).results;
  const tags = (await db.prepare('SELECT tag FROM list_tags WHERE list_id = ?').bind(id).all()).results.map((t) => t.tag);
  const labels = await itemLabels(db, entries.map((e) => e.id));
  return {
    id: list.id,
    owner_id: list.owner_id,
    category_id: list.category_id,
    custom_subtitle: list.custom_subtitle || '',
    kind: list.kind,
    title: list.title,
    tags,
    entries: entries.map((e) => ({
      why: e.why || '',
      dish: e.dish || '',
      item: { local_id: e.id, kind: e.kind, title: e.title, creator: e.creator, year: e.year, narrator: e.narrator, image_url: e.image_url, labels: labels[e.id] || [] }
    }))
  };
}
