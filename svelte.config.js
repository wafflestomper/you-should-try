import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    // Check for a new version every minute, so an open page reloads itself after an update instead of breaking
    version: { pollInterval: 60000 }
  }
};

export default config;
