# 00: Scaffold

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md). This phase is done; it's written out as it was built, so it doubles as a record of the setup.

## Design

**Goal:** an empty but working skeleton. The web app, the API, the database and the shared package all talk to each other, `pnpm check` passes, and the repo is on GitHub.

**Decisions** (spec §3):
- pnpm workspace with `apps/web`, `apps/api` and `packages/shared`, the same layout as Veenix.
- The shared package builds to CommonJS in `dist/` with `tsc`, so the API (`module: nodenext`, CommonJS output) and the web app (bundler resolution) both consume it the same way.
- The API is a hand-written minimal Nest app (no `nest new`), built with `nest build` (tsc). Vitest runs it through SWC, which emits the decorator metadata Nest's dependency injection needs.
- Prisma 7 uses the new `prisma-client` generator, output into `apps/api/src/generated/prisma` (git-ignored, regenerated on `pnpm install`). The database URL lives in `prisma.config.ts`, not the schema. The SQLite driver is `@prisma/adapter-better-sqlite3`.
- No models yet. The health check runs `SELECT 1`, so phase 02 starts from a clean schema.
- Ports: web **3200**, API **4000** (Veenix uses 3100, so both can run at once).

**What it leaves for phase 01:** the placeholder home page is unstyled on purpose.

## Implementation

### Global constraints
- Node 24 LTS (`node --version` → `v24.x`), pnpm 10 (`pnpm --version` → `10.x`).
- Run commands from the repo root in Git Bash unless a step says otherwise.

### Review focus
- **pnpm peer links:** if a Nest test fails with `The "@nestjs/platform-express" package is missing`, `@nestjs/testing` was installed before its peer. Run `pnpm --filter api remove @nestjs/testing && pnpm --filter api add -D @nestjs/testing@^11`.
- **Prisma generated imports:** the generator needs `importFileExtension = "js"`, or `tsc` rejects the `.ts` extensions in the generated client.

---

### Task 0.1: Workspace and root files

**Files:** create `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`.

**Interfaces:** produces the root scripts `dev`, `build`, `test`, `typecheck`, `check`, and the workspace globs `apps/*`, `packages/*`.

- [x] **Step 1:** `package.json`

```json
{
  "name": "hackops",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @hackops/shared build && pnpm --parallel --filter @hackops/shared --filter web --filter api run dev",
    "build": "pnpm --filter @hackops/shared build && pnpm --filter api --filter web build",
    "test": "pnpm -r --if-present test",
    "typecheck": "pnpm -r --if-present typecheck",
    "check": "pnpm --filter @hackops/shared build && pnpm typecheck && pnpm test"
  },
  "engines": { "node": ">=24" },
  "packageManager": "pnpm@10.34.7"
}
```

- [x] **Step 2:** `pnpm-workspace.yaml`

```yaml
packages:
  - apps/*
  - packages/*

# pnpm 10 blocks install scripts unless the package is listed here.
onlyBuiltDependencies:
  - "@prisma/engines"
  - prisma
  - better-sqlite3
  - "@swc/core"
  - esbuild
  - sharp
```

- [x] **Step 3:** `tsconfig.base.json` (ES2023, `module`/`moduleResolution` `nodenext`, strict) and `.gitignore` (ignores `node_modules`, `dist`, `.next`, `.env*` except `.env.example`, `apps/api/prisma/*.db`, `apps/api/src/generated`).

### Task 0.2: `@hackops/shared`

**Files:** `packages/shared/package.json`, `tsconfig.json`, `src/index.ts`, `src/lifecycle.ts`, `src/lifecycle.test.ts`.

**Interfaces:** produces `STAGES`, `Stage`, `PHASES`, `Phase`, `phaseOf(stage)` (spec §5). Phase 02 adds the rest of the enums and schemas beside it.

- [x] **Step 1:** `src/lifecycle.ts`

```ts
export const STAGES = ["discovered", "interested", "registered", "building", "submitted", "results", "skipped"] as const;
export type Stage = (typeof STAGES)[number];

export const PHASES = ["initiation", "planning", "execution", "closing"] as const;
export type Phase = (typeof PHASES)[number];

const PHASE_BY_STAGE: Record<Stage, Phase | null> = {
  discovered: "initiation",
  interested: "initiation",
  registered: "planning",
  building: "execution", // monitoring runs alongside execution
  submitted: "closing",
  results: "closing",
  skipped: null,
};

export function phaseOf(stage: Stage): Phase | null {
  return PHASE_BY_STAGE[stage];
}
```

- [x] **Step 2:** one test that maps every stage; `pnpm --filter @hackops/shared test` → `1 passed`.

### Task 0.3: NestJS API with Prisma

**Files:** `apps/api/package.json`, `nest-cli.json`, `tsconfig.json`, `vitest.config.mts`, `.env.example`, `prisma.config.ts`, `prisma/schema.prisma`, `src/main.ts`, `src/app.module.ts`, `src/prisma.service.ts`, `src/health.controller.ts`, `src/health.test.ts`.

**Interfaces:**
- `PrismaService` (extends the generated `PrismaClient`): inject it anywhere in `AppModule`.
- `GET /health` → `{ "ok": true, "db": "up", "shared": "execution" }`.
- Env: `PORT` (default 4000), `DATABASE_URL` (default `file:./prisma/dev.db`).

- [x] **Step 1: Install**

```bash
cd apps/api
pnpm add @nestjs/common@^11 @nestjs/core@^11 @nestjs/platform-express@^11 reflect-metadata rxjs @prisma/client@7.10.1 @prisma/adapter-better-sqlite3@7.10.1 "@hackops/shared@workspace:*"
pnpm add -D prisma@7.10.1 @nestjs/cli@^11 @nestjs/testing@^11 @swc/core unplugin-swc vitest@^4 supertest @types/supertest @types/express @types/node@^24 typescript@~5.8.3
```
Prisma's `latest` tag was a release candidate (8.0.0-rc) on the day this was written, so 7.10.1 is pinned.

- [x] **Step 2: Prisma** `prisma/schema.prisma`

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  moduleFormat        = "cjs"
  importFileExtension = "js"
}

datasource db {
  provider = "sqlite"
}
```

`prisma.config.ts`

```ts
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" },
});
```

The `postinstall` script runs `prisma generate`.

- [x] **Step 3: Prisma service**

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }) });
  }
  onModuleDestroy() {
    return this.$disconnect();
  }
}
```

- [x] **Step 4: Health controller, module, main.** The controller runs `` this.db.$queryRaw`SELECT 1` `` and returns `phaseOf("building")` to prove the shared package resolves. `main.ts` listens on `PORT` with shutdown hooks.

- [x] **Step 5: Test** `src/health.test.ts` boots `AppModule` against `DATABASE_URL=":memory:"` and calls `GET /health` through supertest.

```bash
pnpm --filter api typecheck && pnpm --filter api test
```
Expected: `1 passed`.

### Task 0.4: Next.js web

**Files:** `apps/web/package.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `.env.example`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`.

**Interfaces:** env `API_URL` (default `http://localhost:4000`). Phase 01 replaces `app/page.tsx` and fills `globals.css`.

- [x] **Step 1: Install**

```bash
cd apps/web
pnpm add next@^16 react@^19 react-dom@^19 "@hackops/shared@workspace:*"
pnpm add -D tailwindcss@^4 @tailwindcss/postcss@^4 postcss typescript@~5.8.3 @types/react@^19 @types/react-dom@^19 @types/node@^24
```

- [x] **Step 2:** a server-rendered placeholder page that fetches `${API_URL}/health` with `cache: "no-store"` and lists `STAGES` from the shared package.

- [x] **Step 3: Check end to end**

```bash
pnpm check
pnpm dev
```
Expected: `pnpm check` passes (2 test files). With `pnpm dev` running, http://localhost:3200 shows "API up, database up" and the stage list; http://localhost:4000/health returns the JSON above.

### Task 0.5: GitHub repo

- [x] **Step 1:** first commit on `main`: `chore: scaffold workspace, shared package, NestJS API and Next.js web`.
- [x] **Step 2:** `gh repo create United-Larper/hackops --public --source . --push --description "…"`.
- [x] **Check:** `gh repo view United-Larper/hackops` shows the repo, public, with the commit.

From phase 01 on, each phase gets a branch `phase-NN-<name>` and a pull request.
