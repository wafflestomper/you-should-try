export async function load({ locals, platform }) {
  const db = platform?.env?.DB;
  if (!db || !locals.user) return { user: null, counts: { tries: 0, unread: 0 }, demoPeople: [], dbMissing: !db };
  const [tries, unread, people] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM try_items WHERE user_id = ? AND status = 'open'").bind(locals.user.id).first(),
    db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').bind(locals.user.id).first(),
    db.prepare("SELECT id, name FROM users WHERE status = 'active' ORDER BY is_admin DESC, name").all()
  ]);
  return { user: locals.user, counts: { tries: tries.n, unread: unread.n }, demoPeople: people.results, dbMissing: false };
}
