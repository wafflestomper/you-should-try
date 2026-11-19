import { error } from '@sveltejs/kit';

// Plays a how-to video (or its cover picture) from storage. Handles byte ranges, which iPhones need to play video.
export async function GET({ params, request, platform }) {
  const bucket = platform?.env?.VIDEOS;
  if (!bucket) error(404, 'Videos are not set up yet.');
  if (!/^[\w-]+\.(mp4|mov|webm|jpg)$/.test(params.key)) error(404);
  // Parse "bytes=a-b", "bytes=a-" or "bytes=-n" ourselves so the reply's Content-Range is exact
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  let range;
  if (m && (m[1] || m[2])) {
    const head = await bucket.head(params.key);
    if (!head) error(404, 'That video is gone.');
    let start = m[1] ? Number(m[1]) : Math.max(0, head.size - Number(m[2]));
    let end = m[1] && m[2] ? Math.min(Number(m[2]), head.size - 1) : head.size - 1;
    if (start >= head.size || start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${head.size}` } });
    range = { offset: start, length: end - start + 1 };
  }
  const obj = await bucket.get(params.key, range ? { range } : { onlyIf: request.headers });
  if (!obj) error(404, 'That video is gone.');
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('etag', obj.httpEtag);
  h.set('accept-ranges', 'bytes');
  h.set('cache-control', 'private, max-age=31536000, immutable'); // each upload gets a new name
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers: h });
  if (range) {
    h.set('content-range', `bytes ${range.offset}-${range.offset + range.length - 1}/${obj.size}`);
    h.set('content-length', String(range.length));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set('content-length', String(obj.size));
  return new Response(obj.body, { headers: h });
}
