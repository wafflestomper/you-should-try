// One-time helper: download cover images for the sample board used in the website's screenshots.
// TV: TVmaze posters. Movies: iTunes posters. Books: Open Library covers. No keys needed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const items = JSON.parse(readFileSync('tour-covers/items.json', 'utf8'));
mkdirSync('tour-covers/img', { recursive: true });
const get = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'YouShouldTry/0.2 (github.com/wafflestomper/you-should-try)' } }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r; };
async function find(it) {
  const q = encodeURIComponent(it.title);
  if (it.kind === 'tv') {
    const d = await (await get(`https://api.tvmaze.com/singlesearch/shows?q=${q}`)).json();
    return d.image?.original || d.image?.medium;
  }
  if (it.kind === 'movie') {
    const d = await (await get(`https://itunes.apple.com/search?media=movie&entity=movie&limit=5&term=${q}`)).json();
    const r = d.results?.find((x) => x.trackName?.toLowerCase().startsWith(it.title.toLowerCase().slice(0, 12))) || d.results?.[0];
    return r?.artworkUrl100?.replace('100x100bb', '600x900bb');
  }
  const d = await (await get(`https://openlibrary.org/search.json?title=${q}${it.creator ? `&author=${encodeURIComponent(it.creator)}` : ''}&fields=cover_i&limit=5`)).json();
  const c = d.docs?.find((x) => x.cover_i)?.cover_i;
  return c ? `https://covers.openlibrary.org/b/id/${c}-L.jpg` : null;
}
const report = [];
for (const it of items) {
  try {
    const url = await find(it);
    if (!url) { report.push(`MISS ${it.title}`); continue; }
    const buf = Buffer.from(await (await get(url)).arrayBuffer());
    writeFileSync(`tour-covers/img/${it.id}.jpg`, buf);
    report.push(`OK   ${it.title}  ${url}`);
  } catch (e) { report.push(`FAIL ${it.title} ${e.message}`); }
}
writeFileSync('tour-covers/report.txt', report.join('\n'));
console.log(report.join('\n'));
