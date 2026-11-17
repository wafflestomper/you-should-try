import { redirect, error } from '@sveltejs/kit';

// Admins only: see the site as someone else.
export const actions = {
  default: async ({ request, cookies, locals }) => {
    if (!locals.realUser?.is_admin) error(403, 'Admins only.');
    const id = String((await request.formData()).get('user') || '');
    if (!id || id === locals.realUser.id) cookies.delete('yst_view_as', { path: '/' });
    else cookies.set('yst_view_as', id, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 12 });
    redirect(303, request.headers.get('referer') || '/');
  }
};
