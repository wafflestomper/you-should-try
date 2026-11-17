import { redirect } from '@sveltejs/kit';
// The Hot 40 is hidden until it's built.
export function load() { redirect(307, '/lists'); }
