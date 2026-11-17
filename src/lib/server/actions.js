// Shared write actions.
const id = () => crypto.randomUUID();

/** Save something to the viewer's try list and let whoever pointed them to it know. */
export async function saveToTry(db, me, itemId, listId = null, fromUserId = null) {
  const entry = listId
    ? await db.prepare('SELECT l.owner_id, e.position FROM list_entries e JOIN lists l ON l.id = e.list_id WHERE e.list_id = ? AND e.item_id = ?').bind(listId, itemId).first()
    : null;
  const from = entry?.owner_id ?? fromUserId ?? null;
  await db.prepare(
    `INSERT INTO try_items (user_id, item_id, from_user_id, from_list_id, from_rank) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, item_id) DO UPDATE SET status = 'open', from_user_id = COALESCE(try_items.from_user_id, excluded.from_user_id)`)
    .bind(me.id, itemId, from, entry ? listId : null, entry?.position ?? null).run();
  if (from && from !== me.id) {
    await db.prepare(
      `INSERT INTO notifications (id, user_id, type, actor_id, item_id, list_id, data) VALUES (?, ?, 'saved_your_pick', ?, ?, ?, ?)`)
      .bind(id(), from, me.id, itemId, entry ? listId : null, JSON.stringify(entry ? { rank: entry.position } : { direct: true })).run();
  }
}

export async function removeFromTry(db, me, itemId) {
  await db.prepare('DELETE FROM try_items WHERE user_id = ? AND item_id = ?').bind(me.id, itemId).run();
}

/** Send a "you should try" straight to one person. */
export async function sendRecommendation(db, me, toUserId, itemId, note) {
  const rid = id();
  await db.batch([
    db.prepare('INSERT INTO recommendations (id, from_user_id, to_user_id, item_id, note) VALUES (?, ?, ?, ?, ?)')
      .bind(rid, me.id, toUserId, itemId, note || null),
    db.prepare(`INSERT INTO notifications (id, user_id, type, actor_id, item_id, data) VALUES (?, ?, 'sent_you', ?, ?, ?)`)
      .bind(id(), toUserId, me.id, itemId, JSON.stringify({ rec: rid }))
  ]);
}

/**
 * Finished something: record the reaction, optionally rank it into one of your lists,
 * and tell the person who recommended it, but only if it made a list.
 */
export async function finishItem(db, me, itemId, { reaction, listId = null, index = null, fromUserId = null, placedListId = null }) {
  const stmts = [];
  let rank = null;
  if (placedListId) {
    // Already saved onto a brand-new list: just read where it landed.
    const e = await db.prepare('SELECT e.position FROM list_entries e JOIN lists l ON l.id = e.list_id WHERE e.list_id = ? AND e.item_id = ? AND l.owner_id = ?')
      .bind(placedListId, itemId, me.id).first();
    rank = e?.position ?? null;
    listId = null;
  } else if (listId != null && index != null) {
    const list = await db.prepare('SELECT id, owner_id FROM lists WHERE id = ?').bind(listId).first();
    if (!list || list.owner_id !== me.id) throw new Error('Pick one of your own lists.');
    const already = await db.prepare('SELECT 1 FROM list_entries WHERE list_id = ? AND item_id = ?').bind(listId, itemId).first();
    if (already) throw new Error('That is already on this list.');
    const count = (await db.prepare('SELECT COUNT(*) AS n FROM list_entries WHERE list_id = ? AND position <= 10').bind(listId).first()).n;
    rank = index < 0 ? 11 : Math.min(index + 1, count + 1);
    stmts.push(db.prepare('UPDATE list_entries SET position = position + 1 WHERE list_id = ? AND position >= ?').bind(listId, rank));
    stmts.push(db.prepare('INSERT INTO list_entries (list_id, item_id, position) VALUES (?, ?, ?)').bind(listId, itemId, rank));
    stmts.push(db.prepare("UPDATE lists SET updated_at = datetime('now') WHERE id = ?").bind(listId));
  }
  const tryRow = await db.prepare('SELECT from_user_id FROM try_items WHERE user_id = ? AND item_id = ?').bind(me.id, itemId).first();
  const recommender = tryRow?.from_user_id ?? fromUserId ?? null;
  if (tryRow) {
    stmts.push(db.prepare(`UPDATE try_items SET status = 'done', reaction = ?, done_at = datetime('now') WHERE user_id = ? AND item_id = ?`).bind(reaction, me.id, itemId));
  } else {
    stmts.push(db.prepare(`INSERT INTO try_items (user_id, item_id, from_user_id, status, reaction, done_at) VALUES (?, ?, ?, 'done', ?, datetime('now'))`)
      .bind(me.id, itemId, recommender, reaction));
  }
  stmts.push(db.prepare("UPDATE recommendations SET seen_at = COALESCE(seen_at, datetime('now')) WHERE to_user_id = ? AND item_id = ?").bind(me.id, itemId));
  if (recommender && recommender !== me.id && rank != null && rank <= 10) {
    const theirs = await db.prepare(
      'SELECT MIN(e.position) AS pos FROM list_entries e JOIN lists l ON l.id = e.list_id WHERE l.owner_id = ? AND e.item_id = ?').bind(recommender, itemId).first();
    stmts.push(db.prepare(`INSERT INTO notifications (id, user_id, type, actor_id, item_id, list_id, data) VALUES (?, ?, 'tried_your_pick', ?, ?, ?, ?)`)
      .bind(id(), recommender, me.id, itemId, listId ?? placedListId, JSON.stringify({ rank, their_rank: theirs?.pos ?? null })));
  }
  await db.batch(stmts);
  if (listId) {
    const ids = (await db.prepare('SELECT item_id FROM list_entries WHERE list_id = ? ORDER BY position').bind(listId).all()).results.map((r) => r.item_id);
    await db.prepare('INSERT INTO list_snapshots (list_id, entries) VALUES (?, ?)').bind(listId, JSON.stringify(ids)).run();
  }
  return { rank };
}
