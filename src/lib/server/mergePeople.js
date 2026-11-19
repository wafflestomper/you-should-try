// Fold one person into another: a not-yet-joined name ("g:<id>") or a second account ("u:<id>") into a member.
// Their picks, reactions, shows and everything else end up under the member; the old entry disappears.
export async function mergePeople(db, fromKey, toId) {
  const [kind, from] = String(fromKey).split(':');
  const to = await db.prepare("SELECT id FROM users WHERE id = ? AND status = 'active'").bind(toId).first();
  if (!to || !from || (kind === 'u' && from === toId)) throw new Error('Pick two different people.');
  const q = (sql, ...a) => db.prepare(sql).bind(...a);
  // After moving, a member can end up recommending the same thing twice: keep the one with a note (or the earliest)
  const dedupe = q(`DELETE FROM recs WHERE by_user_id = ?1 AND EXISTS (
      SELECT 1 FROM recs o WHERE o.by_user_id = ?1 AND o.item_id = recs.item_id AND o.id != recs.id
        AND ((o.note IS NOT NULL AND recs.note IS NULL) OR ((o.note IS NULL) = (recs.note IS NULL) AND (o.created_at < recs.created_at OR (o.created_at = recs.created_at AND o.id < recs.id)))))`, toId);
  let stmts;
  if (kind === 'g') {
    const g = await q('SELECT id, name FROM guests WHERE id = ?', from).first();
    if (!g) throw new Error('That name is already gone.');
    stmts = [
      q('UPDATE recs SET by_user_id = ?, by_guest_id = NULL WHERE by_guest_id = ?', toId, from),
      q('UPDATE guests SET user_id = ? WHERE id = ?', toId, from),
      q("DELETE FROM invites WHERE guest_id = ? AND used_by IS NULL", from),
      dedupe
    ];
    await db.batch(stmts);
    return { name: g.name };
  }
  if (kind !== 'u') throw new Error('Pick who to move.');
  const u = await q("SELECT id, name, email, google_sub FROM users WHERE id = ? AND status = 'active'", from).first();
  if (!u) throw new Error('That account is already gone.');
  // Tables keyed by (person, item): copy what the member doesn't already have, then drop the rest
  const keyed = ['reactions', 'tv_progress', 'board_seen', 'try_items'];
  stmts = [
    q('UPDATE recs SET by_user_id = ? WHERE by_user_id = ?', toId, from),
    q('UPDATE recs SET added_by = ? WHERE added_by = ?', toId, from),
    ...keyed.flatMap((t) => [q(`UPDATE OR IGNORE ${t} SET user_id = ? WHERE user_id = ?`, toId, from), q(`DELETE FROM ${t} WHERE user_id = ?`, from)]),
    q('UPDATE OR IGNORE circle_members SET user_id = ? WHERE user_id = ?', toId, from), q('DELETE FROM circle_members WHERE user_id = ?', from),
    q('UPDATE saved_filters SET user_id = ? WHERE user_id = ?', toId, from),
    q('UPDATE notifications SET user_id = ? WHERE user_id = ?', toId, from),
    q('UPDATE notifications SET actor_id = ? WHERE actor_id = ?', toId, from),
    q('UPDATE invites SET created_by = ? WHERE created_by = ?', toId, from),
    q('UPDATE invites SET used_by = ? WHERE used_by = ?', toId, from),
    q('UPDATE users SET invited_by = ? WHERE invited_by = ?', toId, from),
    q('UPDATE guests SET added_by = ? WHERE added_by = ?', toId, from),
    q('UPDATE guests SET user_id = ? WHERE user_id = ?', toId, from),
    q('UPDATE try_items SET from_user_id = ? WHERE from_user_id = ?', toId, from),
    q('UPDATE items SET details_by = ? WHERE details_by = ?', toId, from),
    q('DELETE FROM sessions WHERE user_id = ?', from),
    // If only the old account had a Google sign-in, it moves over so that login keeps working
    q("UPDATE users SET status = 'merged', google_sub = NULL, email = NULL WHERE id = ?", from),
    q('UPDATE users SET google_sub = COALESCE(google_sub, ?), email = COALESCE(email, ?) WHERE id = ?', u.google_sub, u.email, toId),
    dedupe
  ];
  await db.batch(stmts);
  return { name: u.name };
}
