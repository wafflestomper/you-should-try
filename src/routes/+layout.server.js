export async function load({ locals, platform }) {
  const db = platform?.env?.DB;
  if (!db) return { user: null, dbMissing: true };
  if (!locals.user) return { user: null, dbMissing: false };
  const [tries, unread, people] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM reactions WHERE user_id = ? AND state = 'saved'").bind(locals.user.id).first(),
    db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').bind(locals.user.id).first(),
    locals.realUser?.is_admin
      ? db.prepare("SELECT id, name FROM users WHERE status = 'active' ORDER BY name").all()
      : Promise.resolve({ results: [] })
  ]);
  return {
    user: locals.user,
    realUser: locals.realUser,
    counts: { saved: tries.n, unread: unread.n },
    viewAsPeople: people.results,
    dbMissing: false
  };
}
