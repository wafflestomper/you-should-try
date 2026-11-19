export async function load({ platform }) {
  const videos = (await platform.env.DB.prepare('SELECT id, title, blurb, topic, file_key, poster_key, seconds, width, height FROM videos ORDER BY sort').all()).results;
  return { videos };
}
