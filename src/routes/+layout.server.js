export async function load({ locals, platform, cookies }) {
  const look = cookies.get('yst_look') === 'dark' ? 'dark' : 'light';
  const db = platform?.env?.DB;
  if (!db) return { user: null, dbMissing: true, look };
  if (!locals.user) return { user: null, dbMissing: false, look };
  const [tries, unread, people] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM reactions WHERE user_id = ? AND state = 'saved'").bind(locals.user.id).first(),
    db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL AND type IN ('loved_your_pick','joined_your_pick','possible_dup')").bind(locals.user.id).first(),
    locals.realUser?.is_admin
      ? db.prepare("SELECT id, name FROM users WHERE status = 'active' ORDER BY name").all()
      : Promise.resolve({ results: [] })
  ]);
  return {
    user: locals.user,
    realUser: locals.realUser,
    counts: { saved: tries.n, unread: unread.n },
    viewAsPeople: people.results,
    dbMissing: false,
    look
  };
}
