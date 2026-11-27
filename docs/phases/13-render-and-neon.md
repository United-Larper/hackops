# 13: Render and Neon

## Design

Put HackOps online for free: Render's free web service for the apps, Neon's free Postgres for the data.

- **One service, both apps.** Render's private services aren't free, and two public services would expose the API, which trusts the client address the web app sends. So one web service runs `scripts/start-hosted.mjs`: `prisma migrate deploy`, then the API on `127.0.0.1:4000` and Next.js on `$PORT`. If either stops, both stop and Render restarts the service. The security model of phase 12.9 is unchanged.
- **Postgres everywhere.** A Prisma schema has one provider, so dev, tests and production all use Postgres. Neon has two branches, `prod` and `dev`. The tests run in a `test` schema of `dev` (`DATABASE_SCHEMA`, read by `src/db.ts`) and drop only that schema; CI uses a Postgres container. The SQLite migrations are replaced by one Postgres baseline (`20261127120000_postgres`); their only data steps were backfills for rows a fresh database doesn't have.
- **Two URLs.** The app uses Neon's pooled `DATABASE_URL` through `@prisma/adapter-pg` (`src/db.ts`); the Prisma CLI uses the direct `DATABASE_URL_UNPOOLED` (`prisma.config.ts`).
- **Env files.** `apps/api/.env` is loaded with `process.loadEnvFile` (no dotenv); variables already set win.

## Implementation

### 13.1 Postgres on Neon
Files: `apps/api/prisma/schema.prisma`, `prisma.config.ts`, `src/db.ts`, `src/prisma.service.ts`, `prisma/seed.ts`, `prisma/set-password.ts`, `prisma/migrations/`, `vitest.config.mts`, `test/global-setup.ts`, `.github/workflows/check.yml`.
Check: `pnpm check` with `apps/api/.env` pointing at the dev branch.

### 13.2 One Render service
Files: `render.yaml`, `scripts/start-hosted.mjs`, `apps/web/lib/actions.ts` (`CLIENT_ADDRESS_HEADER`), README "Hosting on Render".
Check: deploy the Blueprint, sign in, open the calendar link from Settings.

## Known limits

- ponytail: the free service sleeps after 15 idle minutes, so the discovery and submission-check crons only run while it's awake. Upgrade: a paid instance, or a Render cron job that calls the refresh.

## As built

- Two Neon branches only (`prod`, `dev`): the tests share `dev` but stay in their own `test` schema, so a run never touches dev data.
- Render's build installs pnpm with `npm install -g pnpm@10.34.7`; Node 26 dropped corepack, so locally use `npx pnpm@10.34.7` or install pnpm.
- 13.2 checked on a real deploy (27 Nov 2026, `https://hackops-f04o.onrender.com`): the Blueprint built and migrated, sign-in works, and the calendar link from Settings downloads the `.ics`. The API port isn't reachable from outside.
- `SITE_URL` must be the service's real address. The first deploy kept the guessed `https://hackops.onrender.com`, so the calendar and bookmarklet links pointed at another site, while everything else (HSTS, secure cookie) looked fine. It's read at build time: fix it with Save, rebuild, and deploy.
- The browser's address: Render sits behind Cloudflare and puts its own address last in `X-Forwarded-For`, so without `CLIENT_ADDRESS_HEADER` a wrong sign-in was recorded under a proxy address, not the browser's. With `CLIENT_ADDRESS_HEADER=true-client-ip` it's the browser's own (checked against the address the browser sees), so `render.yaml` sets it.
- ponytail: not yet checked whether Render replaces a `True-Client-IP` header that a browser sends itself. If it doesn't, a browser could pick its own address for the per-address limit (the per-email limit still holds). Upgrade: send a sign-in with a made-up `True-Client-IP` and check the recorded address.
- No SQLite data carried over: no one had real rows in `dev.db`, so `prod` starts fresh (add members, then `set-password`).
- Title search uses `mode: "insensitive"`, keeping SQLite's case-insensitive `LIKE` behaviour on Postgres.
