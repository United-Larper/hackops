# HackOps

The team's hackathon manager. It finds hackathons in Malaysia and overseas, runs each one as a small project (owner, roles, tasks, deadlines), and turns every submission into a public portfolio entry.

**Status:** design system, app shell and the core API are in; screens fill in phase by phase; see [docs/README.md](docs/README.md).

## Run it

Needs Node 24 and pnpm 10.

```bash
pnpm install
pnpm --filter api exec prisma migrate deploy
pnpm --filter api db:seed
pnpm dev
```

The seed adds a fictional demo team and hackathons, dated relative to today.

- Web: http://localhost:3200
- API: http://localhost:4000/health

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
