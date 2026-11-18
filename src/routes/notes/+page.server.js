export async function load({ platform, locals }) {
  const db = platform.env.DB;
  const notes = (await db.prepare(
    `SELECT n.*, a.name AS actor_name, i.title AS item_title, l.title AS list_title, r.note AS rec_note
       FROM notifications n LEFT JOIN users a ON a.id = n.actor_id LEFT JOIN items i ON i.id = n.item_id LEFT JOIN lists l ON l.id = n.list_id LEFT JOIN recommendations r ON r.id = json_extract(n.data, '$.rec')
      WHERE n.user_id = ? AND n.type IN ('loved_your_pick','joined_your_pick','possible_dup') ORDER BY n.created_at DESC LIMIT 50`).bind(locals.user.id).all()).results;
  for (const n of notes) { n.data = n.data ? JSON.parse(n.data) : {}; n.isNew = !n.read_at; }
  // Opening the page counts as reading them (the dot stays on this visit so you can see what's new)
  await db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").bind(locals.user.id).run();
  return { notes };
}
export const actions = {
  read: async ({ platform, locals }) => {
    await platform.env.DB.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").bind(locals.user.id).run();
  }
};
