import { json } from '@sveltejs/kit';

// Existing tags with how many lists use them, the merge table, and the label-to-tag map for suggestions.
export async function GET({ platform }) {
  const db = platform.env.DB;
  const [tags, merges, map] = await Promise.all([
    db.prepare('SELECT tag, COUNT(*) AS n FROM list_tags GROUP BY tag ORDER BY n DESC').all(),
    db.prepare('SELECT alias, canonical FROM tag_merges').all(),
    db.prepare('SELECT label, tag FROM tag_map').all()
  ]);
  return json({
    tags: tags.results,
    merges: Object.fromEntries(merges.results.map((m) => [m.alias, m.canonical])),
    map: Object.fromEntries(map.results.map((m) => [m.label, m.tag]))
  });
}
