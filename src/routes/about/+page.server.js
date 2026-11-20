import { introVideo } from '$lib/server/introVideo.js';

export async function load({ cookies, platform }) {
  return { look: cookies.get('yst_look') === 'dark' ? 'dark' : 'light', intro: await introVideo(platform.env.DB) };
}
