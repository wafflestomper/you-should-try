// One message at the top of the board, shown the instant something happens (the save finishes behind it).
export const toast = $state({ text: '', undo: null, id: 0 });

let timer;
export function showToast(text, undo = null) {
  toast.text = text; toast.undo = undo; toast.id += 1;
  clearTimeout(timer);
  timer = setTimeout(() => { toast.text = ''; toast.undo = null; }, 10000);
}
export function clearToast() { toast.text = ''; toast.undo = null; }

/** Post a page action in the background without a form on screen. */
export async function postAction(name, fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  const r = await fetch(`?/${name}`, { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
  return r.ok ? r.json() : { type: 'error' };
}
