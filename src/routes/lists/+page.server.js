import { listsWithTop } from '$lib/server/data.js';
export async function load({ platform }) {
  return { lists: await listsWithTop(platform.env.DB, '', [], 200) };
}
