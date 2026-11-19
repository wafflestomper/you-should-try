// The invite message, shared by the "Email it" button, the text message and the site's own email.
// Written to read like a note from a friend, not a promo: says who it's from, what it is and why there's a link.
const firstOf = (n) => String(n || '').trim().split(' ')[0];

export function inviteSubject(fromName) {
  return `${firstOf(fromName)} invited you to our recommendations board`;
}

// Which Google account to use, said plainly (a Gmail address is a Google account; others may or may not be)
export function accountLine(email) {
  if (!email) return '';
  return /@(gmail|googlemail)\.com$/i.test(email)
    ? `When you join, sign in with Google as ${email}, and use that same account every time.`
    : `This invite went to ${email}. Sign in with Google using that address if it's a Google account (or any Google account you use), and stick with the same one every time.`;
}

// The site owner made it; anyone else is passing along someone else's site
const whatItIs = (maker, fromName) => maker
  ? `I made a little website (it's on my own site, zollinhofer.com) where a group of us keep track of the shows, books, movies and restaurants we tell each other about, so nobody has to remember "what was that thing you said?"`
  : `I'm using a little website a friend of mine made where a group of us keep track of the shows, books, movies and restaurants we tell each other about, so nobody has to remember "what was that thing you said?"`;

export function inviteLines({ toName, fromName, picks, link, email, maker = false }) {
  return [
    `Hi ${firstOf(toName)},`, '',
    `It's ${firstOf(fromName)}. ${whatItIs(maker, fromName)}`,
    picks ? `${picks} of your recommendations are already on it.` : '',
    '', `Here's your own invite link. It works once and lasts two weeks:`, link, '',
    `It's free, there are no ads, and only people we invite can see it. ${accountLine(email) || 'You sign in with Google.'}`,
    '', `If you have any questions, just ask me.`, '', `- ${firstOf(fromName)}`
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
}

export const inviteBody = (o) => inviteLines(o).join('\n');

// Short enough for a text, personal enough not to look like spam
export function inviteText({ toName, fromName, link, email, maker = false }) {
  const site = maker ? 'a little website I made' : "a little website we're using";
  return `Hey ${firstOf(toName)}, it's ${firstOf(fromName)}! I'd love for you to join ${site} where a group of us save the shows, books and restaurants we recommend to each other. Here's your personal invite (works once): ${link}` +
    (email ? `\n\nSign in with Google as ${email}.` : '') + `\n\nNo ads, just our group. Text me if you have questions.`;
}
