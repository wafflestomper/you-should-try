export async function load({ platform, locals }) {
  const db = platform.env.DB;
  const notes = (await db.prepare(
    `SELECT n.*, a.name AS actor_name, i.title AS item_title, l.title AS list_title
       FROM notifications n LEFT JOIN users a ON a.id = n.actor_id LEFT JOIN items i ON i.id = n.item_id LEFT JOIN lists l ON l.id = n.list_id
      WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50`).bind(locals.user.id).all()).results;
  for (const n of notes) n.data = n.data ? JSON.parse(n.data) : {};
  return { notes };
}
export const actions = {
  read: async ({ platform, locals }) => {
    await platform.env.DB.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").bind(locals.user.id).run();
  }
};
