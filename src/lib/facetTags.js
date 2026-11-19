// The fixed lists people filter by. Genres come from the databases; moods are guessed by AI from this list only.
export const GENRES = ['Thriller', 'Mystery', 'Crime', 'Drama', 'Comedy', 'Romance', 'Sci-fi', 'Fantasy', 'Horror', 'Action',
  'Adventure', 'Historical', 'War', 'Documentary', 'Animated', 'Family', 'Memoir', 'Nonfiction', 'Young adult', 'Kids', 'Western', 'Music'];
export const MOODS = ['Feel-good', 'Funny', 'Heartwarming', 'Sad', 'Dark', 'Twisty', 'Intense', 'Scary', 'Thought-provoking', 'Light', 'Slow burn', 'Bingeable', 'Page-turner'];
// Only these kinds get genres and moods (restaurants, recipes and places don't fit them)
export const FACET_KINDS = ['movie', 'tv', 'book', 'audiobook'];
