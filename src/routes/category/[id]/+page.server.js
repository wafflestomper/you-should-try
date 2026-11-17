import { error } from '@sveltejs/kit';
import { getCategory } from '$lib/server/data.js';

export async function load({ params, platform }) {
  const data = await getCategory(platform.env.DB, params.id);
  if (!data) error(404, 'That category does not exist.');
  return data;
}
