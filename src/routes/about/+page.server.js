export function load({ cookies }) {
  return { look: cookies.get('yst_look') === 'dark' ? 'dark' : 'light' };
}
