import { fail } from '@sveltejs/kit';

export async function load({ locals }) {
  return { me: { name: locals.user.name, how_known: locals.user.how_known ?? '', email: locals.user.email } };
}

export const actions = {
  save: async ({ request, platform, locals }) => {
    const f = await request.formData();
    const name = String(f.get('name') || '').trim().replace(/\s+/g, ' ');
    const how = String(f.get('how_known') || '').trim().slice(0, 40) || null;
    if (name.length < 1 || name.length > 40) return fail(400, { error: 'Your name needs to be 1 to 40 characters.' });
    await platform.env.DB.prepare('UPDATE users SET name = ?, how_known = ? WHERE id = ?').bind(name, how, locals.user.id).run();
    return { saved: true };
  }
};
