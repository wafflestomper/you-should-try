// The Libby libraries each person checks. Until someone picks their own,
// they get the group's default list (set by an admin).

export async function defaultLibraries(db) {
  const r = await db.prepare("SELECT value FROM settings WHERE key = 'default_libraries'").first();
  try { return JSON.parse(r?.value || '[]'); } catch { return []; }
}
async function saveDefaults(db, libs) {
  await db.prepare("INSERT INTO settings (key, value) VALUES ('default_libraries', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value")
    .bind(JSON.stringify(libs)).run();
}

export async function myLibraries(db, uid) {
  const u = await db.prepare('SELECT libs_custom FROM users WHERE id = ?').bind(uid).first();
  if (!u?.libs_custom) return (await defaultLibraries(db)).map((l) => ({ ...l, isDefault: true }));
  return (await db.prepare('SELECT lib_key AS key, name FROM user_libraries WHERE user_id = ? ORDER BY added_at').bind(uid).all()).results;
}

// First change to the default list turns it into the person's own copy.
async function makeCustom(db, uid) {
  const u = await db.prepare('SELECT libs_custom FROM users WHERE id = ?').bind(uid).first();
  if (u?.libs_custom) return;
  const defs = await defaultLibraries(db);
  await db.batch([
    db.prepare('DELETE FROM user_libraries WHERE user_id = ?').bind(uid),
    ...defs.map((l) => db.prepare('INSERT OR IGNORE INTO user_libraries (user_id, lib_key, name) VALUES (?, ?, ?)').bind(uid, l.key, l.name)),
    db.prepare('UPDATE users SET libs_custom = 1 WHERE id = ?').bind(uid)
  ]);
}

const cleanKey = (k) => String(k || '').toLowerCase().trim();
const validKey = (k) => /^[a-z0-9-]{2,40}$/.test(k);

export const libraryActions = {
  addLib: async ({ request, platform, locals }) => {
    const f = await request.formData();
    const key = cleanKey(f.get('key'));
    const name = String(f.get('name') || key).trim().slice(0, 100);
    if (!validKey(key)) return;
    const db = platform.env.DB;
    await makeCustom(db, locals.user.id);
    await db.prepare('INSERT INTO user_libraries (user_id, lib_key, name) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').bind(locals.user.id, key, name).run();
  },
  removeLib: async ({ request, platform, locals }) => {
    const f = await request.formData();
    const db = platform.env.DB;
    await makeCustom(db, locals.user.id);
    await db.prepare('DELETE FROM user_libraries WHERE user_id = ? AND lib_key = ?').bind(locals.user.id, String(f.get('key'))).run();
  },
  resetLibs: async ({ platform, locals }) => {
    const db = platform.env.DB;
    await db.batch([
      db.prepare('DELETE FROM user_libraries WHERE user_id = ?').bind(locals.user.id),
      db.prepare('UPDATE users SET libs_custom = 0 WHERE id = ?').bind(locals.user.id)
    ]);
  }
};

/** Same buttons, but on the Admin page they edit the group's default list. */
export const defaultLibraryActions = {
  addLib: async ({ request, platform, locals }) => {
    if (!locals.realUser?.is_admin) return;
    const f = await request.formData();
    const key = cleanKey(f.get('key'));
    if (!validKey(key)) return;
    const libs = await defaultLibraries(platform.env.DB);
    if (!libs.some((l) => l.key === key)) libs.push({ key, name: String(f.get('name') || key).trim().slice(0, 100) });
    await saveDefaults(platform.env.DB, libs);
  },
  removeLib: async ({ request, platform, locals }) => {
    if (!locals.realUser?.is_admin) return;
    const key = cleanKey((await request.formData()).get('key'));
    await saveDefaults(platform.env.DB, (await defaultLibraries(platform.env.DB)).filter((l) => l.key !== key));
  }
};
