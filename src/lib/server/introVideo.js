// The video shown on invite pages and /about, if Z picked one
export async function introVideo(db) {
  return db.prepare('SELECT id, title, file_key, poster_key, seconds, width, height FROM videos WHERE on_invite = 1 ORDER BY sort LIMIT 1').first().catch(() => null);
}
