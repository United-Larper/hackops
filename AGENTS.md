<!-- bmad:context -->
<!-- Verified 2026-11-18 against 321229a. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## hackops

The team's hackathon manager: discovery, a workspace per hackathon, team workload, and a public portfolio. pnpm workspace: Next.js 16 web in `apps/web`, NestJS 11 API with Prisma 7 on Postgres (Neon) in `apps/api`, and shared Zod schemas and pure functions in `packages/shared`. Product decisions are in `docs/spec.md`. The work is planned phase by phase in `docs/phases/`, with the index, build rules and progress in `docs/README.md`.

## Policy

- Never commit to `main`; each phase gets a branch `phase-NN-<name>` and a PR. Commit prefixes: `feat(api)`, `feat(web)`, `feat(shared)`, `chore`, `docs`.
- No AI attribution in commits or PRs: no `Co-Authored-By` trailer and no "Generated with" line.
- Never invent real hackathons: `apps/api/data/my-hackathons.json` ships empty on purpose. Seed and demo rows carry `source: "demo"`.
- `GET /portfolio` is public. Add each field by hand in `apps/api/src/portfolio.controller.ts`, never by spreading a model. Member contact and sign-up fields, decision notes, retro text and result notes never leave the API.
- `GET /signup-profile` is the only route with open CORS (the bookmarklet calls it from third-party pages). It needs a member's own `fillToken` and returns only that member's sign-up fields plus the team name and pitch; never add CORS anywhere else.
- Every API route needs a signed-in session except the `PUBLIC` list in `apps/api/src/auth.ts`. Adding a route there makes it reachable by anyone on this computer: it needs a reason in its comment and its own check (like a token).
- Secrets (password hashes, fill tokens) live only in `MemberSecret`, never on `Member`: `toMemberDto` spreads the Member row. Session tokens are stored only as SHA-256 hashes.
- The API binds to `127.0.0.1` (`main.ts`), also when hosted (on Render, `scripts/start-hosted.mjs` runs it inside the one web service): only the web app reaches it, and it trusts the `x-client-address` the web app sends. The web app serves `/signup-profile` and `/calendar.ics` through rewrites in `next.config.ts`, and `proxy.ts` lists them as public.
- Outbound fetches of user-typed URLs go through `pointsInward()` (`apps/api/src/intel/submission-check.ts`) first and use its `guarded` dispatcher, whose DNS lookup refuses private addresses at connect time; scraper fetches go through `get()` in `apps/api/src/discovery/http.ts`, which refuses redirects off the source's site.
- In `apps/web/`, any `catch` around `api()` starts with `unstable_rethrow(e)`, or it swallows the redirect to /login on an expired session. Server actions need no CSRF code: Next.js rejects cross-origin action posts.
- Pages carry a nonce CSP from `proxy.ts`: no inline `<script>` and no third-party scripts. Signed-in checks of your own password (password change, two-step) answer 403, so `lib/api.ts` can keep treating every 401 except sign-in as an expired session.
- Never cut corners on validation at the API boundary, escaping scraped text before showing it, scraper rate limits, or anything that submits a form in the team's name.
- UI work uses the impeccable and ui-ux-pro-max skills against `apps/web/DESIGN.md`. Icons and the logo are SVG files in `apps/web/public/`, never a React icon package.

## Where things are

- Starting or resuming a phase: find the first unticked box in `docs/README.md` and open that phase in `docs/phases/`. When the phase is done, tick its boxes and add "As built" notes at the end of the phase file.
- Visual rules and tokens: `apps/web/DESIGN.md`. Per-surface design contracts: `apps/web/.impeccable/surfaces/`.

## Running and verifying

- Node 24 or later, pnpm 10.34.7 (`engines` and `packageManager` in the root `package.json`).
- Before calling work done, run `pnpm check`. It builds `@hackops/shared` first; plain `pnpm test` and `pnpm typecheck` don't.
- After editing `packages/shared`, run `pnpm --filter @hackops/shared build` before type-checking or testing api or web. Both read its `dist/`, not `src/`.
- `apps/web` has no tests. Check it with `pnpm --filter web typecheck` and `pnpm --filter web build`.
- The API tests run in a `test` schema of the dev database (`DATABASE_SCHEMA`, `test/global-setup.ts`) and drop only that schema each run; app data is in `public`. Never point `apps/api/.env` at the prod branch. CI uses a Postgres container.
- Restore demo data with `SEED_PASSWORD=… pnpm --filter api db:seed` (without it, members keep their passwords and new ones have none; use `pnpm --filter api set-password <email>`). Never use `db:reset`, which wipes the database. The seed doesn't clear `result`, `resultNote` or retro text; clear those through the API.
- After UI edits, run `impeccable detect --json <paths>` from `apps/web`. The CLI is in the impeccable skill's `scripts/` folder and isn't on PATH.

## Conventions that differ from defaults

- Keep one Nest module (`AppModule`): no interface with one implementation, no factory for one product. One test per real rule. Mark a simplification with a known limit with a `ponytail:` comment naming the limit and the upgrade path.
- In `apps/web/`, the API is called only server-side through `lib/api.ts` (`no-store`). Mutations are server actions in `lib/actions.ts` that call the API, then `refresh()`.
- Change a hackathon's stage only through `POST /hackathons/:id/stage` (`apps/api/src/stage.ts`). Writing `stage` directly skips the task template, the activity log and the result rule.
- In `apps/web/`: Next.js 16 differs from training data. Check `apps/web/node_modules/next/dist/docs/` before using an API you're unsure of.

## Known pitfalls

- Never run `pnpm --filter web build` while `next dev` runs in `apps/web`. They share `.next`, and the dev server then serves stale modules. Stop dev, build, then restart it.
- Build PATCH schemas with `patchOf()` in `packages/shared/src/schemas.ts`, never `.partial()`. Zod 4 keeps `.default()` inside `.partial()`, so omitted fields get reset.

<!-- /bmad:context -->
