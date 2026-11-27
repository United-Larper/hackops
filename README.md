# HackOps

The team's hackathon manager. It finds hackathons in Malaysia and overseas, runs each one as a small project (owner, roles, tasks, deadlines), and turns every submission into a public portfolio entry.

**Status:** phases 00–10 and 12 (security and per-member sign-in) are done; phase 11 is the "later" list. See [docs/README.md](docs/README.md).

## Run it

Needs Node 24 and pnpm 10.34.7 (Node 26 dropped corepack: `npm install -g pnpm@10.34.7`, or `npx pnpm@10.34.7` in place of `pnpm`), and a Postgres database: a free [Neon](https://neon.tech) project. Give it two branches: `prod` (the hosted app) and `dev` (your machine). Copy `apps/api/.env.example` to `apps/api/.env` and fill in the `dev` branch's pooled and direct URLs (Neon → Connect). The tests run in a separate `test` schema of `dev`, which every run wipes; your dev data in `public` stays.

```bash
pnpm install
pnpm --filter @hackops/shared build
pnpm --filter api db:deploy
SEED_PASSWORD=choose-a-demo-password pnpm --filter api db:seed
pnpm dev
```

The seed adds a fictional demo team and hackathons, dated relative to today. With `SEED_PASSWORD` set (10+ characters), the demo members sign in as `aina@example.com`, `weijie@example.com`, `harish@example.com` and `sofia@example.com` with that password.

**Signing in:** every page except the public portfolio needs a member's email and password. For a real member, or a forgotten password, run `pnpm --filter api set-password <email>` on the machine running HackOps: it prints a temporary password once and signs that member out everywhere. They change it on their own page under Team.

The API and the web app listen on `127.0.0.1` only. To put HackOps online, see [Hosting](#hosting).

- Web: http://localhost:3200
- API: http://localhost:4000/health
- Calendar feed: your own link is on Settings (`http://localhost:3200/calendar.ics?token=…`, the same secret as your bookmarklet). Save it and import it into Google Calendar (Settings → Import), or subscribe to the URL from Outlook or Apple Calendar on the same machine. Every deadline and open task comes with reminders 7 days, 2 days and 3 hours before (Google ignores feed reminders, so set default notifications on that calendar).

```bash
pnpm check
```
builds the shared package, type-checks everything and runs the tests.

## Hosting

Only the web app faces the internet. The API keeps listening on `127.0.0.1` on the same machine: the web app calls it server-side, and serves the bookmarklet's `/signup-profile` and the `/calendar.ics` feed from its own address.

1. Build and run both: `pnpm --filter api build && node apps/api/dist/main.js`, and `pnpm --filter web build && pnpm --filter web start`.
2. Put an HTTPS reverse proxy in front of `127.0.0.1:3200`, for example Caddy: `hackops.example.com { reverse_proxy 127.0.0.1:3200 }`. It must add the browser's address to `X-Forwarded-For`; the sign-in limit per address reads the last entry. Caddy does this by default; with nginx, use `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`.
3. Set `SITE_URL=https://hackops.example.com` in `apps/web/.env`. That makes the session cookie `secure`, adds HSTS and `upgrade-insecure-requests`, and puts the public address in the bookmarklet and calendar links.
4. Leave `HOST` unset in `apps/api/.env`, and don't open port 4000. The API trusts the address the web app passes on, so nothing else may reach it.

### Hosting on Render (free)

One free Render web service runs both apps: `scripts/start-hosted.mjs` applies migrations, starts the API on `127.0.0.1:4000` inside the service and the web app on Render's port. The API is never public, so everything above still holds. The database is the Neon `prod` branch.

1. Neon: create the project in the region closest to the service (Singapore, `ap-southeast-1`, matches `render.yaml`). Copy the `prod` branch's pooled URL (host has `-pooler`) and direct URL.
2. Render → New → Blueprint → this repository. It reads `render.yaml` and asks for `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct) and `SITE_URL`. Render shows the address (`https://hackops-xxxx.onrender.com`) only once the service exists: put in a guess, then fix `SITE_URL` under Environment and redeploy, since the web build reads it.
3. First member: from your machine, pass the `prod` URLs on the command line, so `apps/api/.env` keeps pointing at `dev` (variables already set win over `.env`):
   ```bash
   DATABASE_URL='<prod pooled URL>' DATABASE_URL_UNPOOLED='<prod direct URL>' pnpm --filter api set-password <email>
   ```
   The same prefix works for `SEED_PASSWORD=… pnpm --filter api db:seed`. Never point `.env` itself at `prod`: `pnpm dev` would run the crons against prod data, and `pnpm check` would build its `test` schema there.
4. Sign-in limit per address: Render's proxy adds its own address to `X-Forwarded-For`, so by default every browser may share one limit (safe, but one attacker can lock everyone out of sign-in for 15 minutes). Check which header holds your own address, then set `CLIENT_ADDRESS_HEADER` to it (likely `true-client-ip`) and redeploy. Only use a header Render sets and overwrites itself, never one a browser can send.

Limits of the free plan: the service sleeps after 15 minutes without visits (the next visit takes about a minute to wake it), and the daily discovery refresh and hourly submission check only run while it's awake. A paid instance, or a cron service calling it, removes that.

## Layout

| Path | What |
|---|---|
| `apps/web` | Next.js 16 app: every screen |
| `apps/api` | NestJS 11 API with Prisma 7 on Postgres (Neon) |
| `packages/shared` | `@hackops/shared`: schemas, enums and pure functions used by both |
| `docs/` | spec, phases (design + implementation), progress |
