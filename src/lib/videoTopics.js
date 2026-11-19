// Where a how-to video can show up as a "Show me" link
export const VIDEO_TOPICS = [
  ['start', 'Getting started'],
  ['add', 'Adding a pick'],
  ['board', 'The board'],
  ['filter', 'Saved filters'],
  ['watching', 'Watching'],
  ['invite', 'Inviting people'],
  ['', 'Other']
];
export const topicLabel = (t) => VIDEO_TOPICS.find(([k]) => k === (t || ''))?.[1] ?? 'Other';
export const clock = (s) => { s = Math.round(s || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
