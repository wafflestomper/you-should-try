// One way to call TMDB. Works with either kind of TMDB credential:
// the short "API Key" (v3) or the long "API Read Access Token" (starts with eyJ).
export async function tmdb(path, params, rawKey, timeout = 8000) {
  const key = String(rawKey || '').trim();
  if (!key) throw new Error('no TMDB key');
  const q = new URLSearchParams(params || {});
  const headers = { accept: 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  else q.set('api_key', key);
  const r = await fetch(`https://api.themoviedb.org/3${path}?${q}`, { headers, signal: AbortSignal.timeout(timeout) });
  if (r.status === 401) throw new Error('TMDB turned the key down (401). Check the TMDB_KEY secret in Cloudflare.');
  if (!r.ok) throw new Error(`TMDB answered ${r.status}`);
  return r.json();
}
