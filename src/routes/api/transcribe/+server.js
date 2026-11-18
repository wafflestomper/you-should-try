import { json } from '@sveltejs/kit';
import { transcribe } from '$lib/server/parse.js';

export async function POST({ request, platform }) {
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.length < 800) return json({ error: "Didn't catch that. Hold the button a little longer." }, { status: 400 });
  if (buf.length > 4_000_000) return json({ error: 'That clip is too long. Keep it to a sentence or two.' }, { status: 400 });
  try {
    const text = await transcribe(platform.env, buf);
    if (!text) return json({ error: "Didn't catch any words. Try again a little closer to the phone." }, { status: 422 });
    return json({ text });
  } catch (e) {
    return json({ error: e.message || 'Voice is not responding right now. Type it instead.' }, { status: 503 });
  }
}
