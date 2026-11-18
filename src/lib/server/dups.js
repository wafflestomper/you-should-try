// Finding and merging cards that are probably the same thing ("Dungeon Crawl Carl" vs "Dungeon Crawler Carl").

const norm = (t) => String(t || '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();

function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

const FAMILY = { book: 'read', audiobook: 'read', movie: 'watch', tv: 'watch' };
const fam = (k) => FAMILY[k] || k;

export function similar(a, b) {
  if (fam(a.kind) !== fam(b.kind)) return 0;
  const x = norm(a.title), y = norm(b.title);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if ((x.length > 4 && y.includes(x)) || (y.length > 4 && x.includes(y))) return 0.9;
  const d = lev(x, y);
  return 1 - d / Math.max(x.length, y.length);
}

/** Pairs of items on the board that look like the same thing, best matches first. */
export async function possibleDups(db, onlyItemId = null) {
  const items = (await db.prepare(
    `SELECT i.id, i.kind, i.title, i.creator, i.image_url, COUNT(r.id) AS recs
     FROM items i JOIN recs r ON r.item_id = i.id GROUP BY i.id`).all()).results;
  const dismissed = new Set((await db.prepare('SELECT a, b FROM dup_dismissed').all()).results.map((d) => `${d.a}|${d.b}`));
  const out = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const [a, b] = [items[i], items[j]].sort((p, q) => (p.id < q.id ? -1 : 1));
      if (onlyItemId && a.id !== onlyItemId && b.id !== onlyItemId) continue;
      if (dismissed.has(`${a.id}|${b.id}`)) continue;
      const s = similar(a, b);
      if (s >= 0.8) out.push({ a, b, score: Math.round(s * 100) });
    }
  }
  return out.sort((p, q) => q.score - p.score);
}

/** Move everything from one card onto another. */
export async function mergeItems(db, me, fromId, toId) {
  if (fromId === toId) return;
  const from = (await db.prepare('SELECT by_user_id, by_guest_id, id FROM recs WHERE item_id = ?').bind(fromId).all()).results;
  const toRecs = (await db.prepare('SELECT by_user_id, by_guest_id FROM recs WHERE item_id = ?').bind(toId).all()).results;
  const has = new Set(toRecs.map((r) => r.by_user_id ? `u${r.by_user_id}` : `g${r.by_guest_id}`));
  const stmts = [];
  for (const r of from) {
    const k = r.by_user_id ? `u${r.by_user_id}` : `g${r.by_guest_id}`;
    stmts.push(has.has(k)
      ? db.prepare('DELETE FROM recs WHERE id = ?').bind(r.id)
      : db.prepare('UPDATE recs SET item_id = ? WHERE id = ?').bind(toId, r.id));
    has.add(k);
  }
  // Reactions: keep the one already on the target if someone reacted to both
  stmts.push(db.prepare(`UPDATE reactions SET item_id = ? WHERE item_id = ? AND user_id NOT IN (SELECT user_id FROM reactions WHERE item_id = ?)`).bind(toId, fromId, toId));
  stmts.push(db.prepare('DELETE FROM reactions WHERE item_id = ?').bind(fromId));
  stmts.push(db.prepare('INSERT INTO item_merges (from_id, to_id, merged_by) VALUES (?, ?, ?)').bind(fromId, toId, me));
  await db.batch(stmts);
}

/** After a new recommendation: tell admins if it looks like something already there. */
export async function flagIfDup(db, me, itemId) {
  const hits = await possibleDups(db, itemId);
  if (!hits.length) return;
  const admins = (await db.prepare("SELECT id FROM users WHERE is_admin = 1 AND status = 'active'").all()).results;
  const other = hits[0].a.id === itemId ? hits[0].b : hits[0].a;
  await db.batch(admins.map((a) => db.prepare(
    `INSERT INTO notifications (id, user_id, type, actor_id, item_id, data) VALUES (?, ?, 'possible_dup', ?, ?, ?)`)
    .bind(crypto.randomUUID(), a.id, me, itemId, JSON.stringify({ other: other.title, score: hits[0].score }))));
}
