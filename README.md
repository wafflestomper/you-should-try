# You Should Try…

A private, invite-only site where friends rank their top 10 books, audiobooks, movies, shows, restaurants, and recipes with head-to-head face-offs, then tell each other what they should try.

Built with SvelteKit, hosted free on Cloudflare Workers, with a Cloudflare D1 database.

## What works right now (slice 1)

- Home page with the chalkboard board, "For you" feed, taste matches, "Something different," and your try list
- List pages, category pages with the group's consensus top 10, item pages, people pages, notifications
- **Try it** saves something to your try list and notifies the person whose list it came from
- Demo data, plus a "Demo: viewing as" menu at the bottom to see the site as different people

Sign-in with Google, making new lists, and face-offs come in the next updates.

## Setup on Cloudflare (one time)

1. **Log in** at dash.cloudflare.com.
2. **Create the database.** Go to **Storage & Databases → D1 SQL Database → Create database**. Name it `you-should-try` and click **Create**. Copy the **Database ID** shown on the next page. It is not a secret, so send it to Claude in the chat; it goes in `wrangler.jsonc`.
3. **Connect this repo.** Go to **Compute (Workers) → Workers & Pages → Create → Import a repository**, pick `you-should-try`, and use these settings:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`
4. **Deploy.** Every push to `main` rebuilds and redeploys the site. The first deploy also fills the database with demo data.
5. **Your address (optional).** In the Worker's **Settings → Domains & Routes**, add a custom domain such as `try.zollinhofer.com`, then follow Cloudflare's instructions for the DNS record at DreamHost.

## Running it on a computer (optional)

```
npm install
npm run db:local
npm run build && npx wrangler dev
```

Then open http://localhost:8787.

## Folders

- `migrations/` database tables and demo data
- `src/lib/server/` database reads and writes
- `src/routes/` the pages
- `src/lib/components/` shared pieces like the chalkboard ribbon, corners, and covers
