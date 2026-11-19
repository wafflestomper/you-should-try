import { json } from '@sveltejs/kit';
import { rulesParse, aiParse } from '$lib/server/parse.js';
import { search, splitYear } from '$lib/server/search.js';
import { onBoard } from '$lib/server/board.js';

export async function POST({ request, platform, locals }) {
  const db = platform.env.DB;
  const { text } = await request.json().catch(() => ({}));
  const said = String(text || '').trim().slice(0, 400);
  if (!said) return json({ error: 'Say or type what you heard.' }, { status: 400 });

  const members = (await db.prepare("SELECT id, name FROM users WHERE status = 'active' AND is_guest = 0").all()).results;
  const rules = rulesParse(said, members);
  const ai = await aiParse(platform.env, said, members);
  const p = ai && ai.title ? { ...rules, ...Object.fromEntries(Object.entries(ai).filter(([, v]) => v)) } : rules;
  if (!p.kind && /\bwatch(ed|ing)?\b/i.test(said)) p.kindGuess = ['tv', 'movie'];

  // Someone already named on the board but not a member?
  if (p.by?.type === 'new') {
    const g = await db.prepare('SELECT id, name FROM guests WHERE lower(name) = lower(?) OR lower(name) LIKE lower(?) LIMIT 1')
      .bind(p.by.name, p.by.name.split(' ')[0] + ' %').first();
    if (g) p.by = { type: 'guest', id: g.id, name: g.name };
  }
  if (p.by?.type === 'user' && p.by.id === locals.user.id) p.by = { type: 'me', id: locals.user.id, name: locals.user.name };

  // "Severance 2022": the year helps the search but isn't part of the title
  if (p.title) { const sy = splitYear(p.title); if (sy.year) { p.title = sy.title; p.year = p.year || sy.year; } }

  // Find matching titles to pick from
  let matches = [];
  let note = null;
  if (p.title) {
    const kinds = p.kind ? [p.kind] : p.kindGuess ?? ['book', 'tv', 'movie'];
    // A year said out loud ("the crash, 2026") narrows the search even if it didn't end up in the title
    const spokenYear = Number((said.match(/\b((?:19[2-9]|20[0-3])\d)\b/) || [])[1]) || null;
    const found = await Promise.all(kinds.map((k) => search(db, platform.env, k, p.title, { year: p.year || spokenYear }).catch(() => ({ results: [] }))));
    matches = found.flatMap((f) => f.results).slice(0, 6);
    note = found.find((f) => f.note)?.note ?? null;
  }
  const ob = await onBoard(db, matches.map((m) => m.local_id));
  for (const m of matches) if (ob[m.local_id]) m.onBoard = ob[m.local_id];
  return json({ heard: said, parsed: p, matches, note, usedAI: !!(ai && ai.title) });
}
