// Cover picture + length for a how-to video, read with the same decoder that shrinks videos.
// Works on iPhones, where a hidden <video> element often never hands over a frame.
export async function makeCover(src) {
  const M = await import('mediabunny');
  const input = new M.Input({ source: typeof src === 'string' ? new M.UrlSource(src) : new M.BlobSource(src), formats: M.ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) return null;
  const seconds = await input.computeDuration();
  const w = track.displayWidth, h = track.displayHeight;
  const out = { seconds, width: w, height: h, poster: null };
  if (!(await track.canDecode())) return out;
  const s = Math.min(1, 720 / Math.max(w, h));
  const sink = new M.CanvasSink(track, { width: Math.round(w * s), height: Math.round(h * s), fit: 'fill', poolSize: 1 });
  // A couple of seconds in: the very first frame of a screen recording is often a blank or the Control Center
  const frame = (await sink.getCanvas(Math.min(2, seconds / 3))) ?? (await sink.getCanvas(0));
  if (!frame) return out;
  const c = frame.canvas;
  out.poster = 'convertToBlob' in c ? await c.convertToBlob({ type: 'image/jpeg', quality: 0.8 }) : await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
  return out;
}
