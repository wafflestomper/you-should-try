// One show's episode info and your place in it. GET ?season=N for that season's episode names.
// POST { op: 'set', s, e } | { op: 'next' } | { op: 'stop' } to change your place.
import { json, error } from '@sveltejs/kit';
import { showInfo, seasonEpisodes, setProgress } from '$lib/server/tv.js';
import { nextAfter, standing } from '$lib/tvmath.js';
import { react } from '$lib/server/board.js';

async function load(platform, id) {
  const item = await platform.env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
  if (!item || item.kind !== 'tv') error(404, 'Not a TV show.');
  return item;
}

export async function GET({ params, platform, locals, url }) {
  if (!locals.user) error(401, 'Sign in first.');
  const db = platform.env.DB, item = await load(platform, params.id);
  const n = url.searchParams.get('season');
  if (n != null) return json({ episodes: await seasonEpisodes(db, platform.env, item, Number(n)) });
  const [info, p, recs] = await Promise.all([
    showInfo(db, platform.env, item),
    db.prepare("SELECT season AS s, episode AS e, caught_up_at FROM tv_progress WHERE user_id = ? AND item_id = ? AND status = 'watching'").bind(locals.user.id, item.id).first(),
    db.prepare('SELECT COUNT(*) AS n FROM recs WHERE item_id = ?').bind(item.id).first()
  ]);
  return json({ info, progress: p ?? null, standing: p && info ? standing(info, p.s, p.e) : null, onBoard: recs.n > 0, title: item.title });
}

export async function POST({ params, platform, locals, request }) {
  if (!locals.user) error(401, 'Sign in first.');
  const db = platform.env.DB, me = locals.user.id, item = await load(platform, params.id);
  const body = await request.json().catch(() => ({}));
  const saved = await db.prepare('SELECT data FROM tv_meta WHERE item_id = ?').bind(item.id).first();
  const info = saved ? JSON.parse(saved.data) : await showInfo(db, platform.env, item);
  if (body.op === 'rate') {
    // Finished it: record the rating like the board's "Watched it" (and optionally recommend it), then it leaves Watching
    const r = ['loved', 'liked', 'not_for_me'].includes(body.reaction) ? body.reaction : null;
    if (!r) error(400, 'Pick how it was.');
    await react(db, me, item.id, 'done', r, !!body.share);
    await db.prepare("UPDATE tv_progress SET status = 'done', updated_at = datetime('now') WHERE user_id = ? AND item_id = ?").bind(me, item.id).run();
    return json({ ok: true });
  }
  if (body.op === 'stop') {
    await db.prepare("UPDATE tv_progress SET status = 'stopped', updated_at = datetime('now') WHERE user_id = ? AND item_id = ?").bind(me, item.id).run();
    return json({ progress: null });
  }
  let s, e;
  if (body.op === 'next') {
    const p = await db.prepare('SELECT season AS s, episode AS e FROM tv_progress WHERE user_id = ? AND item_id = ?').bind(me, item.id).first();
    const nx = nextAfter(info, p?.s ?? 1, p?.e ?? 0);
    if (!nx) return json({ progress: p, standing: info ? standing(info, p.s, p.e) : null });
    ({ s, e } = nx);
  } else {
    s = Math.max(0, Math.round(Number(body.s) || 1)); e = Math.max(0, Math.round(Number(body.e) || 0));
  }
  const st = await setProgress(db, me, item.id, s, e, info);
  return json({ progress: { s, e }, standing: st });
}
