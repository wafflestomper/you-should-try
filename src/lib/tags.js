// Tag cleanup shared by the browser and the server.
export function normTag(raw, merges = {}) {
  const t = String(raw ?? '')
    .toLowerCase().trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return merges[t] || merges[t.replace(/-/g, '')] || t;
}

export const MAX_TAGS = 5;
export const KIND = { book: 'Book', audiobook: 'Audiobook', movie: 'Movie', tv: 'TV show', restaurant: 'Restaurant', recipe: 'Recipe', mixed: 'Mixed' };
export const KIND_PLURAL = { book: 'books', audiobook: 'audiobooks', movie: 'movies', tv: 'shows', restaurant: 'restaurants', recipe: 'recipes' };
