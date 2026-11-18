// If the site was updated while this page was open, the old page can ask for files that no longer exist.
// Reload once to pick up the new version instead of showing an error.
export function handleError({ error }) {
  const msg = String(error?.message ?? error);
  if (/dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch/i.test(msg)) {
    try {
      if (!sessionStorage.getItem('yst_reloaded')) { sessionStorage.setItem('yst_reloaded', '1'); location.reload(); }
    } catch { location.reload(); }
  }
  return { message: 'Something went wrong on this page. Reloading usually fixes it.' };
}
