# HackOps

The team's hackathon manager. It finds hackathons in Malaysia and overseas, runs each one as a small project (owner, roles, tasks, deadlines), and turns every submission into a public portfolio entry.

**Status:** phases 00–10 and 12 (security and per-member sign-in) are done; phase 11 is the "later" list. See [docs/README.md](docs/README.md).

## Run it

Needs Node 24 and pnpm 10 (`corepack enable` gives you the pinned pnpm).

```bash
pnpm install
pnpm --filter @hackops/shared build
pnpm --filter api exec prisma migrate deploy
SEED_PASSWORD=choose-a-demo-password pnpm --filter api db:seed
pnpm dev
```

The seed adds a fictional demo team and hackathons, dated relative to today. With `SEED_PASSWORD` set (10+ characters), the demo members sign in as `aina@example.com`, `weijie@example.com`, `harish@example.com` and `sofia@example.com` with that password.

**Signing in:** every page except the public portfolio needs a member's email and password. For a real member, or a forgotten password, run `pnpm --filter api set-password <email>` on the machine running HackOps: it prints a temporary password once and signs that member out everywhere. They change it on their own page under Team.

The API and the web app listen on `127.0.0.1` only. To reach them from another device, set `HOST` in `apps/api/.env` and change `-H` in `apps/web/package.json` deliberately.

- Web: http://localhost:3200
- API: http://localhost:4000/health
- Calendar feed: your own link is on Settings (`http://localhost:4000/calendar.ics?token=…`, the same secret as your bookmarklet). Save it and import it into Google Calendar (Settings → Import), or subscribe to the URL from Outlook or Apple Calendar on the same machine. Every deadline and open task comes with reminders 7 days, 2 days and 3 hours before (Google ignores feed reminders, so set default notifications on that calendar).

```bash
pnpm check
```
builds the shared package, type-checks everything and runs the tests.

## Layout

| Path | What |
|---|---|
| `apps/web` | Next.js 16 app: every screen |
| `apps/api` | NestJS 11 API with Prisma 7 on SQLite |
| `packages/shared` | `@hackops/shared`: schemas, enums and pure functions used by both |
| `docs/` | spec, phases (design + implementation), progress |
