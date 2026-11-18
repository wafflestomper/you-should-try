// The invite message, shared by the "Email it" button and the site's own email.
export function inviteSubject(fromName) {
  return `${String(fromName).split(' ')[0]} says you should try this`;
}

export function inviteLines({ toName, fromName, picks, link }) {
  const first = String(toName || '').split(' ')[0];
  return [
    `Hi ${first},`, '',
    `I'm using a little site where friends keep track of the shows, books and places we tell each other about, so nobody forgets "what was that thing you said?"`,
    picks ? `${picks} of your recommendations are already on it.` : '',
    '', `Here's your invite (it works once and lasts two weeks):`, link, '',
    `It's free and private, just our group. Sign in with Google.`, '', `- ${fromName}`
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
}

export const inviteBody = (o) => inviteLines(o).join('\n');
