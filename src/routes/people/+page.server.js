import { tasteMatch } from '$lib/server/data.js';
export async function load({ platform, locals }) {
  const db = platform.env.DB;
  const users = (await db.prepare(
    `SELECT u.id, u.name, u.color, GROUP_CONCAT(c.name, ', ') AS circles
       FROM users u LEFT JOIN circle_members m ON m.user_id = u.id LEFT JOIN circles c ON c.id = m.circle_id AND c.status = 'ok'
      WHERE u.status = 'active' GROUP BY u.id ORDER BY u.name`).all()).results;
  const rows = (await db.prepare(
    `SELECT l.owner_id, e.item_id, MIN(e.position) AS pos FROM list_entries e JOIN lists l ON l.id = e.list_id GROUP BY l.owner_id, e.item_id`).all()).results;
  const by = {};
  for (const r of rows) (by[r.owner_id] ||= {})[r.item_id] = r.pos;
  const people = users.filter((u) => u.id !== locals.user.id).map((u) => ({ ...u, pct: tasteMatch(by[locals.user.id], by[u.id]).pct }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  return { people };
}
