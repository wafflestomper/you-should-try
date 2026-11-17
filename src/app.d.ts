// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    interface Locals {
      user: { id: string; name: string; is_admin: number } | null;
    }
    interface Platform {
      env: {
        DB: D1Database;
      };
    }
  }
}

export {};
