import { json, error } from '@sveltejs/kit';

// Admin upload of how-to videos, in pieces (big phone videos are over the 100 MB single-request limit)
function setup(platform, locals) {
  if (!locals.realUser?.is_admin) error(403, 'Admins only.');
  const bucket = platform?.env?.VIDEOS;
  if (!bucket) error(503, 'Video storage is not connected yet.');
  return bucket;
}
const okKey = (k) => /^[\w-]+\.(mp4|mov|webm|jpg)$/.test(k || '');

export async function POST({ url, request, platform, locals }) {
  const bucket = setup(platform, locals);
  const op = url.searchParams.get('op');
  if (op === 'start') {
    const { type } = await request.json();
    const ext = /quicktime/.test(type) ? 'mov' : /webm/.test(type) ? 'webm' : 'mp4';
    const key = `${crypto.randomUUID()}.${ext}`;
    const up = await bucket.createMultipartUpload(key, { httpMetadata: { contentType: type || 'video/mp4' } });
    return json({ key, uploadId: up.uploadId });
  }
  if (op === 'done') {
    const b = await request.json();
    if (!okKey(b.key) || !b.title?.trim()) error(400, 'Missing title.');
    await bucket.resumeMultipartUpload(b.key, b.uploadId).complete(b.parts);
    const db = platform.env.DB;
    const top = await db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM videos').first();
    const id = crypto.randomUUID();
    await db.prepare('INSERT INTO videos (id, title, blurb, topic, file_key, poster_key, bytes, seconds, width, height, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, b.title.trim().slice(0, 80), b.blurb?.trim().slice(0, 200) || null, b.topic || null, b.key, okKey(b.poster) ? b.poster : null,
        b.bytes | 0, Number(b.seconds) || null, b.width | 0 || null, b.height | 0 || null, top.n).run();
    return json({ id });
  }
  if (op === 'abort') {
    const b = await request.json();
    if (okKey(b.key)) await bucket.resumeMultipartUpload(b.key, b.uploadId).abort().catch(() => {});
    return json({ ok: true });
  }
  error(400);
}

export async function PUT({ url, request, platform, locals }) {
  const bucket = setup(platform, locals);
  const op = url.searchParams.get('op');
  if (op === 'part') {
    const key = url.searchParams.get('key'), n = Number(url.searchParams.get('n'));
    if (!okKey(key) || !(n >= 1 && n <= 1000)) error(400);
    const part = await bucket.resumeMultipartUpload(key, url.searchParams.get('uploadId')).uploadPart(n, await request.arrayBuffer());
    return json({ partNumber: part.partNumber, etag: part.etag });
  }
  if (op === 'poster') {
    const key = `${crypto.randomUUID()}.jpg`;
    await bucket.put(key, await request.arrayBuffer(), { httpMetadata: { contentType: 'image/jpeg' } });
    return json({ key });
  }
  error(400);
}
