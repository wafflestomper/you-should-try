// Until Google sign-in is added, everyone browses as a demo person.
// The "Viewing as" menu in the footer switches between them.
export async function handle({ event, resolve }) {
  const db = event.platform?.env?.DB;
  const id = event.cookies.get('yst_demo_user') || 'u-z';
  event.locals.user = null;
  if (db) {
    event.locals.user = await db
      .prepare("SELECT id, name, color, is_admin FROM users WHERE id = ? AND status = 'active'")
      .bind(id)
      .first();
  }
  return resolve(event);
}
