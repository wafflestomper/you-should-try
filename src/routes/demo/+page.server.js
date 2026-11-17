import { redirect } from '@sveltejs/kit';

export const actions = {
  switch: async ({ request, cookies }) => {
    const form = await request.formData();
    cookies.set('yst_demo_user', String(form.get('user') || 'u-z'), { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' });
    redirect(303, request.headers.get('referer') || '/');
  }
};
