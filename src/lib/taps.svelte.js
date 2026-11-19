// "Show my taps" for screen recordings: draws a circle wherever you touch, and a trail when you swipe.
// Remembered on this device. Turn on or off from your profile, the link at the bottom of any page, or ?taps=1 / ?taps=0.
export const taps = $state({ on: false });

export function setTaps(on) {
  taps.on = on;
  try { localStorage.setItem('yst_taps', on ? '1' : ''); } catch {}
}
export function readTaps() {
  try {
    const q = new URLSearchParams(location.search).get('taps');
    if (q === '1' || q === '0') setTaps(q === '1');
    else taps.on = localStorage.getItem('yst_taps') === '1';
  } catch {}
}
