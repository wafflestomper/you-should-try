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
  const sayM = t.match(new RegExp(`\\b([A-Z][a-z]+(?:\\s[A-Z][a-z]+)?)\\s+${SAY}`));
  if (!by && sayM) by = { type: 'new', name: sayM[1] };
  const fromM = !by && t.match(/\b(?:from|per|according to)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  if (fromM) by = { type: 'new', name: fromM[1] };

  let kind = null;
  for (const [k, re] of KIND_WORDS) if (re.test(t)) { kind = k; break; }

  // Title: strip the "who said it" part and filler
  let title = t;
  if (sayM) title = title.replace(sayM[0], ' ');
  if (fromM) title = title.replace(fromM[0], ' ');
  if (by?.type === 'user') title = title.replace(new RegExp(`\\b${by.name.split(' ')[0]}\\b('s)?`, 'i'), ' ');
  title = title
    .replace(new RegExp(`\\b${SAY}\\b`, 'gi'), ' ')
    .replace(/\b(you|we|i|everyone)\s+(should|need to|have to|gotta|must)\s+(really\s+)?(watch|read|try|listen to|see|go to|eat at|make|check out)?\b/gi, ' ')
    .replace(/\b(the\s+)?(audio ?book|book|novel|movie|film|tv show|show|series|podcast|restaurant|recipe)\b(\s+called)?/gi, ' ')
    .replace(/\b(called|named|it's|its|a|an)\b\s*$/i, ' ')
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
  const prompt = `Someone heard a recommendation and said this out loud:
"${text}"

Pull out the details. Reply with only a JSON object, no other text:
{"kind": one of [${kinds}] or null, "title": the exact title or name of the thing (fix obvious speech-to-text errors, use proper capitalization), "creator": author, director, or city if mentioned else null, "recommender": the first name or full name of the person who recommended it or null, "note": any extra detail worth keeping (like what to order or which season) else null}

Members of the group (match the recommender to one of these when it sounds the same): ${names}`;
  try {
    const r = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: 0.1
    });
    const raw = typeof r?.response === 'string' ? r.response : JSON.stringify(r?.response ?? '');
    const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    let by = null;
    if (j.recommender) {
      const n = String(j.recommender).trim().toLowerCase();
      const m = members.find((x) => x.name.toLowerCase() === n) || members.find((x) => x.name.toLowerCase().split(' ')[0] === n.split(' ')[0]);
      by = m ? { type: 'user', id: m.id, name: m.name } : { type: 'new', name: String(j.recommender).trim() };
    }
    return {
      kind: KINDS[j.kind] ? j.kind : null,
      title: j.title ? String(j.title).trim() : '',
      creator: j.creator || null,
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
