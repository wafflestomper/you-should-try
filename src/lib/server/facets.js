// Works out genres (from TMDB and Open Library) and moods (AI) for items, a few at a time in the background.
import { tmdb } from './tmdb.js';
import { tmdbRef, budget } from './where.js';
import { GENRES, MOODS, FACET_KINDS } from '$lib/facetTags.js';

const UA = 'YouShouldTry/0.2 (github.com/wafflestomper/you-should-try)';

// Database labels ("Detective and mystery stories", "Sci-Fi & Fantasy") to our genres
const RULES = [
  [/thriller|suspense/, 'Thriller'], [/myster|detective|whodunit/, 'Mystery'], [/\bcrime\b|criminal|murder|heist/, 'Crime'],
  [/^drama$|\bdrama\b/, 'Drama'], [/comed|humor|humour|satire/, 'Comedy'], [/romance|love stor/, 'Romance'],
  [/science fiction|sci-fi|\bspace\b|dystopia/, 'Sci-fi'], [/fantasy|magic|dragons/, 'Fantasy'], [/horror|ghost stor|supernatural/, 'Horror'],
  [/^action|action & adventure/, 'Action'], [/adventure/, 'Adventure'], [/historical|^history$|history, /, 'Historical'],
  [/\bwar\b|war & politics|world war/, 'War'], [/documentar/, 'Documentary'], [/animat/, 'Animated'], [/^family$/, 'Family'],
  [/biograph|autobiograph|memoir/, 'Memoir'], [/nonfiction|non-fiction|self-help|essays/, 'Nonfiction'],
  [/young adult|teen/, 'Young adult'], [/juvenile|^kids$|children/, 'Kids'], [/western/, 'Western'], [/^music$|musical/, 'Music']
];
export function genresFromLabels(labels) {
  const out = new Set();
  for (const raw of labels || []) {
    const l = String(raw).toLowerCase().trim();
    if (/large type|in library|accessible book|protected daisy|open library/.test(l)) continue;
    for (const [re, g] of RULES) if (re.test(l)) out.add(g);
  }
  // A book shelved as both kids' and grown-up fiction is usually a kids' book; keep the list short and useful
  return [...out].slice(0, 5);
}

// Labels and a short description straight from the source
async function lookUp(db, env, item) {
  const labels = (await db.prepare('SELECT label FROM item_tags WHERE item_id = ?').bind(item.id).all()).results.map((r) => r.label);
  let about = '';
  try {
    if ((item.kind === 'movie' || item.kind === 'tv') && env.TMDB_KEY && env.TMDB_KEY !== 'demo') {
      const ref = await tmdbRef(db, item, env.TMDB_KEY, budget(2));
      if (ref) {
        const [type, id] = ref.split(':');
        const d = await tmdb(`/${type}/${id}`, {}, env.TMDB_KEY);
        labels.push(...(d.genres || []).map((g) => g.name));
        about = d.overview || '';
      }
    } else if ((item.kind === 'book' || item.kind === 'audiobook') && item.source === 'openlibrary' && /^\/works\/OL\w+$/.test(item.source_id || '')) {
      const r = await fetch(`https://openlibrary.org${item.source_id}.json`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(6000) });
      if (r.ok) {
        const d = await r.json();
        labels.push(...(d.subjects || []).slice(0, 40));
        about = typeof d.description === 'string' ? d.description : d.description?.value || '';
      }
    }
  } catch { /* the outside lookup is best effort; AI still gets the title */ }
  return { labels, about: about.replace(/\s+/g, ' ').slice(0, 700) };
}

// AI picks 1 to 3 moods from the fixed list, using what the databases say plus friends' notes
async function guessMoods(env, item, genres, about, notes) {
  if (env.TV_DEMO) return demoMoods(item);
  if (!env.AI) return [];
  const allowed = MOODS.filter((m) => (m === 'Bingeable' ? item.kind === 'tv' : m === 'Page-turner' ? ['book', 'audiobook'].includes(item.kind) : true));
  const kindWord = { tv: 'TV show', movie: 'movie', book: 'book', audiobook: 'audiobook' }[item.kind];
  const prompt = `You tag ${kindWord}s with moods for a friends' recommendation board.
Title: ${item.title}${item.year ? ` (${item.year})` : ''}${item.creator ? `, by ${item.creator}` : ''}
Genres: ${genres.join(', ') || 'unknown'}
About: ${about || 'not given'}
What friends said: ${notes.length ? notes.map((n) => `"${n}"`).join(' ') : 'nothing'}

Pick the 1 to 3 moods that best describe how it feels to watch or read it, only from this list: ${allowed.join(', ')}.
If you don't know this title and there's nothing to go on, answer [].
Answer with only a JSON array of the moods, like ["Twisty","Dark"].`;
  try {
    const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages: [{ role: 'user', content: prompt }], max_tokens: 60, temperature: 0 });
    const text = typeof r?.response === 'string' ? r.response : JSON.stringify(r?.response ?? '');
    const arr = JSON.parse(text.match(/\[[^\]]*\]/)?.[0] ?? '[]');
    return [...new Set(arr.map(String))].filter((m) => allowed.includes(m)).slice(0, 3);
  } catch { return []; }
}

// Local testing only: steady made-up moods so the screens can be tried without the AI
function demoMoods(item) {
  let h = 0; for (const c of item.title) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = MOODS.filter((m) => (m === 'Bingeable' ? item.kind === 'tv' : m === 'Page-turner' ? ['book', 'audiobook'].includes(item.kind) : true));
  return [pool[h % pool.length], pool[(h >>> 5) % pool.length]].filter((v, i, a) => a.indexOf(v) === i);
}
const DEMO_GENRES = { 'Slow Horses': ['Thriller', 'Comedy'], 'Yellowjackets': ['Thriller', 'Horror', 'Drama'], 'Gone Girl': ['Thriller', 'Mystery'],
  'The Martian': ['Sci-fi', 'Adventure'], 'Breaking Bad': ['Crime', 'Drama'], 'The Wire': ['Crime', 'Drama'], 'Daisy Jones & the Six': ['Drama', 'Music'],
  'Fool Me Once': ['Mystery', 'Thriller'], 'Safe': ['Mystery', 'Thriller'], 'Platonic': ['Comedy'], 'The Good Place': ['Comedy', 'Fantasy'],
  'Silo': ['Sci-fi', 'Drama'], 'Band of Brothers': ['War', 'Historical'], 'Chernobyl': ['Historical', 'Drama'], 'The Gilded Age': ['Historical', 'Drama'],
  'Brooklyn Nine-Nine': ['Comedy', 'Crime'], 'The Pitt': ['Drama'], 'Dark': ['Sci-fi', 'Mystery'], 'Reacher': ['Action', 'Crime'], '11/22/63': ['Sci-fi', 'Historical'],
  'Fight Club': ['Drama', 'Thriller'], 'The Prestige': ['Mystery', 'Sci-fi'], '12 Angry Men': ['Drama', 'Crime'], 'Killing Eve': ['Thriller', 'Comedy'] };

/** Work out genres and moods for one item and save them. Keeps moods someone fixed by hand. */
export async function facetItem(db, env, item) {
  if (!FACET_KINDS.includes(item.kind)) {
    await db.prepare("UPDATE items SET facets_at = datetime('now') WHERE id = ?").bind(item.id).run();
    return;
  }
  const { labels, about } = env.TV_DEMO ? { labels: [], about: '' } : await lookUp(db, env, item);
  const genres = env.TV_DEMO ? DEMO_GENRES[item.title] ?? [] : genresFromLabels(labels);
  const notes = (await db.prepare("SELECT note FROM recs WHERE item_id = ? AND note IS NOT NULL AND note != '' LIMIT 4").bind(item.id).all()).results.map((r) => r.note.slice(0, 200));
  const moods = item.moods_by_user ? null : await guessMoods(env, item, genres, about, notes);
  const q = (sql, ...a) => db.prepare(sql).bind(...a);
  await db.batch([
    q("DELETE FROM item_facets WHERE item_id = ? AND type = 'genre'", item.id),
    ...genres.filter((g) => GENRES.includes(g)).map((g) => q("INSERT OR IGNORE INTO item_facets (item_id, type, tag, source) VALUES (?, 'genre', ?, 'db')", item.id, g)),
    ...(moods ? [q("DELETE FROM item_facets WHERE item_id = ? AND type = 'mood'", item.id),
      ...moods.map((m) => q("INSERT OR IGNORE INTO item_facets (item_id, type, tag, source) VALUES (?, 'mood', ?, 'ai')", item.id, m))] : []),
    q("UPDATE items SET facets_at = datetime('now') WHERE id = ?", item.id)
  ]);
}

/** Tag up to `max` items on the board that haven't been done yet. Returns how many are still left. */
export async function facetSome(db, env, max = 3) {
  const todo = (await db.prepare(`SELECT * FROM items WHERE facets_at IS NULL AND id IN (SELECT item_id FROM recs UNION SELECT item_id FROM reactions) ORDER BY created_at DESC LIMIT ?`).bind(max).all()).results;
  for (const it of todo) {
    try { await facetItem(db, env, it); } catch (e) {
      console.warn('facet failed', it.id, e?.message);
      // Mark it done anyway so one bad item can't block the rest; "Redo all" on the Admin page tries again
      await db.prepare("UPDATE items SET facets_at = datetime('now') WHERE id = ?").bind(it.id).run().catch(() => {});
    }
  }
  const left = await db.prepare('SELECT COUNT(*) AS n FROM items WHERE facets_at IS NULL AND id IN (SELECT item_id FROM recs UNION SELECT item_id FROM reactions)').first();
  return left.n;
}

/** After a response is sent: tag this item if it hasn't been yet. */
export function facetSoon(platform, itemId) {
  const db = platform.env.DB;
  const job = db.prepare('SELECT * FROM items WHERE id = ? AND facets_at IS NULL').bind(itemId).first()
    .then((it) => it && facetItem(db, platform.env, it)).catch(() => {});
  const ctx = platform.context ?? platform.ctx;
  ctx?.waitUntil ? ctx.waitUntil(job) : null;
}
