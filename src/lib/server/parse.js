// Turn "Warren recommended Green Eggs and Ham, the book" into fields.
import { KINDS } from './board.js';

const KIND_WORDS = [
  ['audiobook', /\baudio ?books?\b|\blisten(ed|ing)? to\b/i],
  ['podcast', /\bpodcasts?\b/i],
  ['book', /\b(book|novel|read|reading|memoir)\b/i],
  ['tv', /\b(tv|show|series|season|episodes?|binge)\b/i],
  ['movie', /\b(movie|film|flick)\b/i],
  ['recipe', /\b(recipe|make|cook|bake)\b/i],
  ['restaurant', /\b(restaurant|eat|ate|lunch|dinner|brunch|breakfast|bakery|cafe|bar|pizza|tacos?|food)\b/i],
  ['place', /\b(go to|visit|trip|park|museum|hike|beach|place)\b/i]
];
const SAY = '(?:just\\s+)?(?:recommended|recommends|suggested|suggests|said|says|told me|loves|loved|swears by|raved about|mentioned)';

export function rulesParse(text, members = []) {
  let t = ` ${text.trim()} `;
  let by = null;
  // Members first: full name, then first name
  const lower = t.toLowerCase();
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  for (const m of sorted) {
    const full = m.name.toLowerCase();
    const first = full.split(' ')[0];
    if (lower.includes(` ${full}`) || new RegExp(`\\b${first}\\b`).test(lower) && new RegExp(`\\b${first}('s)?\\s+${SAY}`, 'i').test(t)) {
      by = { type: 'user', id: m.id, name: m.name };
      break;
    }
  }
  // "... recommended by Warren", "... from Warren", "Warren's pick"
  const byM = t.match(/\b(?:(?:was|were|is|got|came)\s+)?(?:highly\s+)?(?:recommended|suggested|mentioned|pitched)\s+(?:to (?:me|us)\s+)?by\s+([A-Za-z][a-z]+(?:\s[A-Z][a-z]+)?)/i)
    || t.match(/\b(?:from|per|according to|via)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/)
    || t.match(/\b([A-Z][a-z]+)'s\s+(?:pick|recommendation|rec|suggestion|favorite)/);
  const sayM = !byM && t.match(new RegExp(`\\b([A-Z][a-z]+(?:\\s[A-Z][a-z]+)?)\\s+${SAY}`));
  const who = byM?.[1] || (sayM && sayM[1]);
  if (who) {
    const lw = who.toLowerCase();
    const m = members.find((x) => x.name.toLowerCase() === lw) || members.find((x) => x.name.toLowerCase().split(' ')[0] === lw.split(' ')[0]);
    if (m && (!by || by.id !== m.id)) by = { type: 'user', id: m.id, name: m.name };
    else if (!by) by = { type: 'new', name: who.replace(/^./, (c) => c.toUpperCase()) };
  }
  const fromM = null;

  let kind = null;
  for (const [k, re] of KIND_WORDS) if (re.test(t)) { kind = k; break; }

  // Title: strip the "who said it" part and filler
  let title = t;
  if (byM) title = title.replace(byM[0], ' ');
  if (sayM) title = title.replace(sayM[0], ' ');
  if (by?.type === 'user') title = title.replace(new RegExp(`\\b${by.name.split(' ')[0]}\\b('s)?`, 'i'), ' ');
  title = title
    .replace(new RegExp(`\\b${SAY}\\b`, 'gi'), ' ')
    .replace(/\b(you|we|i|everyone)\s+(should|need to|have to|gotta|must)\s+(really\s+)?(watch|read|try|listen to|see|go to|eat at|make|check out)?\b/gi, ' ')
    .replace(/\b(the\s+)?(audio ?book|book|novel|movie|film|tv show|show|series|podcast|restaurant|recipe)\b(\s+called)?/gi, ' ')
    .replace(/\b(called|named|it's|its|a|an|was|is|were|that|which)\b\s*$/i, ' ')
    .replace(/\b(called|named|it's|its|a|an|was|is|were|that|which)\b\s*$/i, ' ')
    .replace(/^[\s,.:;-]*(that|the one|is|was)?\s*/i, '')
    .replace(/[\s,.:;!?-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { kind, title, by, note: null };
}

export async function aiParse(env, text, members = []) {
  if (!env.AI) return null;
  const names = members.map((m) => m.name).join(', ');
  const kinds = Object.keys(KINDS).join(', ');
  const prompt = `You turn a quick spoken note about a recommendation into fields.
The note says what someone should try (a book, show, movie, podcast, restaurant, recipe, place) and usually WHO recommended it.
The recommender is never part of the title. "by <name>" after "recommended" means the recommender, not the author.

Kinds: ${kinds}
Group members (match the recommender to one of these when it sounds similar): ${names}

Examples:
Note: "Dungeon Crawler Carl was recommended by Warren"
{"kind":"book","title":"Dungeon Crawler Carl","creator":"Matt Dinniman","recommender":"Warren","note":null}
Note: "Amy says we have to watch Slow Horses, start with season two"
{"kind":"tv","title":"Slow Horses","creator":null,"recommender":"Amy","note":"Start with season two"}
Note: "Casa Luna in Richmond, get the mole, from Dana"
{"kind":"restaurant","title":"Casa Luna","creator":"Richmond","recommender":"Dana","note":"Get the mole"}
Note: "the pound cake recipe Liz makes"
{"kind":"recipe","title":"Pound cake","creator":null,"recommender":"Liz","note":null}

Reply with only the JSON object for this note. Fix obvious speech-to-text mistakes in titles and names and use proper capitalization. creator is the author, director, network or city, only if you are confident; never the recommender.
Note: "${text.replace(/"/g, "'")}"`;
  try {
    let r;
    try {
      r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: 0 });
    } catch {
      r = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: 0 });
    }
    const raw = typeof r?.response === 'string' ? r.response : JSON.stringify(r?.response ?? '');
    const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    let by = null;
    if (j.recommender) {
      const n = String(j.recommender).trim().toLowerCase();
      const m = members.find((x) => x.name.toLowerCase() === n) || members.find((x) => x.name.toLowerCase().split(' ')[0] === n.split(' ')[0]);
      by = m ? { type: 'user', id: m.id, name: m.name } : { type: 'new', name: String(j.recommender).trim() };
    }
    // Safety net: never let the recommender leak into the title or creator
    let title = j.title ? String(j.title).trim() : '';
    let creator = j.creator || null;
    if (j.recommender) {
      const rn = String(j.recommender).trim();
      title = title.replace(new RegExp(`\\s*(,|by|from|per|-)?\\s*${rn.replace(/[.*+?^${}()|[\]\\]/g, '')}\\s*$`, 'i'), '').trim();
      if (creator && creator.toLowerCase() === rn.toLowerCase()) creator = null;
    }
    return {
      kind: KINDS[j.kind] ? j.kind : null,
      title,
      creator,
      by,
      note: j.note || null
    };
  } catch {
    return null;
  }
}

export async function transcribe(env, bytes) {
  if (!env.AI) throw new Error('Voice is not set up on this site yet.');
  let b64 = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) b64 += String.fromCharCode(...bytes.subarray(i, i + chunk));
  b64 = btoa(b64);
  try {
    const r = await env.AI.run('@cf/openai/whisper-large-v3-turbo', { audio: b64, language: 'en' });
    return (r?.text || '').trim();
  } catch {
    const r = await env.AI.run('@cf/openai/whisper', { audio: [...bytes] });
    return (r?.text || '').trim();
  }
}
