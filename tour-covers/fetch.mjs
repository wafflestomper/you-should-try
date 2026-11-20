// One-time helper: download cover images for the sample board used in the website's screenshots.
// TV: TVmaze posters. Movies: iTunes posters. Books: Open Library covers. No keys needed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const items = JSON.parse(readFileSync('tour-covers/items.json', 'utf8')).filter((it) => it.kind === 'movie');
mkdirSync('tour-covers/img', { recursive: true });
const get = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'YouShouldTry/0.2 (github.com/wafflestomper/you-should-try)' } }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r; };
async function find(it) {
  const q = encodeURIComponent(it.title);
  if (it.kind === 'tv') {
    const d = await (await get(`https://api.tvmaze.com/singlesearch/shows?q=${q}`)).json();
    return d.image?.original || d.image?.medium;
  }
  if (it.kind === 'movie') {
    // Wikipedia's lead image for a film article is its poster
    for (const t of [`${it.title} (film)`, `${it.title} (${it.year} film)`, it.title]) {
      const d = await (await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&redirects=1&titles=${encodeURIComponent(t)}`)).json();
      const pg = Object.values(d.query?.pages || {})[0];
      if (pg?.original?.source) return pg.original.source;
    }
    return null;
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
writeFileSync('tour-covers/report-movies.txt', report.join('\n'));
console.log(report.join('\n'));
