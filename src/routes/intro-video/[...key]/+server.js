import { error } from '@sveltejs/kit';
import { GET as serve } from '../../v/[...key]/+server.js';

// The invite-page intro video (and its cover), for people who haven't joined yet.
// Only files that belong to the video marked "on the invite page" are served here.
export async function GET(event) {
  const key = event.params.key;
  const ok = await event.platform?.env?.DB?.prepare('SELECT 1 FROM videos WHERE on_invite = 1 AND (file_key = ?1 OR poster_key = ?1)').bind(key).first();
  if (!ok) error(404);
  return serve(event);
}
