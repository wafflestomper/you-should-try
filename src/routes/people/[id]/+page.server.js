import { error } from '@sveltejs/kit';
import { listsWithTop } from '$lib/server/data.js';
export async function load({ params, platform }) {
  const db = platform.env.DB;
  const person = await db.prepare(
    `SELECT u.*, i.name AS invited_by_name FROM users u LEFT JOIN users i ON i.id = u.invited_by WHERE u.id = ? AND u.status = 'active'`).bind(params.id).first();
  if (!person) error(404, 'That person is not here.');
  const lists = await listsWithTop(db, 'WHERE l.owner_id = ?', [params.id], 100);
  return { person, lists };
}
