// The Libby libraries each person checks.
export async function myLibraries(db, uid) {
  return (await db.prepare('SELECT lib_key AS key, name FROM user_libraries WHERE user_id = ? ORDER BY added_at').bind(uid).all()).results;
}

export const libraryActions = {
  addLib: async ({ request, platform, locals }) => {
    const f = await request.formData();
    const key = String(f.get('key') || '').toLowerCase().trim();
    const name = String(f.get('name') || key).trim().slice(0, 100);
    if (!/^[a-z0-9-]{2,40}$/.test(key)) return;
    await platform.env.DB.prepare('INSERT INTO user_libraries (user_id, lib_key, name) VALUES (?, ?, ?) ON CONFLICT DO NOTHING')
      .bind(locals.user.id, key, name).run();
  },
  removeLib: async ({ request, platform, locals }) => {
    const f = await request.formData();
    await platform.env.DB.prepare('DELETE FROM user_libraries WHERE user_id = ? AND lib_key = ?').bind(locals.user.id, String(f.get('key'))).run();
  }
};
