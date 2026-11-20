// One-time helper: download cover images for the sample board used in the website's screenshots.
// TV: TVmaze posters. Movies: iTunes posters. Books: Open Library covers. No keys needed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const items = JSON.parse(readFileSync('tour-covers/items.json', 'utf8')).filter((it) => it.kind === 'movie' && !['12 Angry Men'].includes(it.title));
mkdirSync('tour-covers/img', { recursive: true });
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { await nap(2500); const r = await fetch(u, { headers: { 'user-agent': 'YouShouldTryScreenshots/1.0 (https://github.com/wafflestomper/you-should-try; one-time cover fetch)' } }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r; };
async function find(it) {
  const q = encodeURIComponent(it.title);
  if (it.kind === 'tv') {
    const d = await (await get(`https://api.tvmaze.com/singlesearch/shows?q=${q}`)).json();
    return d.image?.original || d.image?.medium;
  }
  if (it.kind === 'movie') {
    // The poster named in the Wikipedia article's infobox (posters are hosted on en.wikipedia itself)
    for (const t of [`${it.title} (film)`, `${it.title} (${it.year} film)`, it.title]) {
      const d = await (await get(`https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&section=0&redirects=1&page=${encodeURIComponent(t)}`)).json();
      const wt = d.parse?.wikitext?.['*'] || '';
      if (!/infobox film/i.test(wt)) continue;
      const file = wt.match(/\|\s*image\s*=\s*([^\n|]+\.(?:jpe?g|png))/i)?.[1]?.trim();
      if (!file) continue;
      const i = await (await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=600&titles=${encodeURIComponent('File:' + file)}`)).json();
      const pg = Object.values(i.query?.pages || {})[0];
      const u = pg?.imageinfo?.[0]?.thumburl || pg?.imageinfo?.[0]?.url;
      if (u) return u;
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
