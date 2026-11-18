// One color per type, used on cards, filters and the add screen.
// Order = how often we expect each to come up.
export const KIND_INFO = [
  { key: 'book', deep: '#1E3FA8', label: 'Book', plural: 'Books', color: '#2563EB', soft: '#E3ECFD' },
  { key: 'movie', deep: '#A3123A', label: 'Movie', plural: 'Movies', color: '#DC2626', soft: '#FDE7E7' },
  { key: 'tv', deep: '#0B6E66', label: 'TV show', plural: 'TV', color: '#0D9488', soft: '#DDF3F1' },
  { key: 'restaurant', deep: '#B4430A', label: 'Restaurant', plural: 'Restaurants', color: '#EA580C', soft: '#FDEBDD' },
  { key: 'audiobook', deep: '#5B26B8', label: 'Audiobook', plural: 'Audiobooks', color: '#7C3AED', soft: '#EEE6FD' },
  { key: 'podcast', deep: '#9D174D', label: 'Podcast', plural: 'Podcasts', color: '#DB2777', soft: '#FCE4F0' },
  { key: 'recipe', deep: '#7C4A03', label: 'Recipe', plural: 'Recipes', color: '#A16207', soft: '#F8EED9' },
  { key: 'place', deep: '#3F6212', label: 'Place to go', plural: 'Places', color: '#4D7C0F', soft: '#E9F2DC' },
  { key: 'other', deep: '#3F3F46', label: 'Other', plural: 'Other', color: '#57534E', soft: '#ECEAE7' }
];
export const KIND = Object.fromEntries(KIND_INFO.map((k) => [k.key, k]));
export const kindColor = (k) => KIND[k]?.color ?? '#57534E';
export const kindSoft = (k) => KIND[k]?.soft ?? '#ECEAE7';
export const kindDeep = (k) => KIND[k]?.deep ?? '#3F3F46';
