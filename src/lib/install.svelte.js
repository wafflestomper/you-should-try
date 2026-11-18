// Which phone and browser this is, and whether the site is already on the home screen.
export const install = $state({ prompt: null, ready: false, info: null });

export function detect() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  let browser = 'other';
  if (ios) browser = /CriOS/.test(ua) ? 'chrome' : /FxiOS/.test(ua) ? 'firefox' : /EdgiOS/.test(ua) ? 'edge' : 'safari';
  else if (android) browser = /SamsungBrowser/.test(ua) ? 'samsung' : /Firefox/.test(ua) ? 'firefox' : 'chrome';
  else browser = /Edg\//.test(ua) ? 'edge' : /Chrome\//.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'other';
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  const platform = ios ? 'ios' : android ? 'android' : 'desktop';
  return { platform, browser, standalone, key: `${platform}-${browser}` };
}

export function listenForInstall() {
  install.info = detect();
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); install.prompt = e; install.ready = true; });
  window.addEventListener('appinstalled', () => { install.prompt = null; install.ready = false; });
}
