// Shared write actions.
const id = () => crypto.randomUUID();

/** Save something to the viewer's try list and let the person whose list it came from know. */
export async function saveToTry(db, me, itemId, listId) {
  const entry = listId
    ? await db.prepare('SELECT l.owner_id, e.position FROM list_entries e JOIN lists l ON l.id = e.list_id WHERE e.list_id = ? AND e.item_id = ?').bind(listId, itemId).first()
    : null;
  await db.prepare(
    `INSERT INTO try_items (user_id, item_id, from_user_id, from_list_id, from_rank) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, item_id) DO NOTHING`)
    .bind(me.id, itemId, entry?.owner_id ?? null, entry ? listId : null, entry?.position ?? null).run();
  if (entry && entry.owner_id !== me.id) {
    await db.prepare(
      `INSERT INTO notifications (id, user_id, type, actor_id, item_id, list_id, data) VALUES (?, ?, 'saved_your_pick', ?, ?, ?, ?)`)
      .bind(id(), entry.owner_id, me.id, itemId, listId, JSON.stringify({ rank: entry.position })).run();
  }
}

export async function removeFromTry(db, me, itemId) {
  await db.prepare('DELETE FROM try_items WHERE user_id = ? AND item_id = ?').bind(me.id, itemId).run();
}
