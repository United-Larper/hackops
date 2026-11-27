# 15: Schema cleanup

## Design

A bloat audit of the data model (27 Nov 2026) found columns that are stored twice, columns that are written but never read, and lists still stored as JSON strings from the SQLite days. This phase removes them in one Postgres migration, because most of the changes rewrite the same list-handling code. No new features. Every screen should look and behave as before, except where a field nothing read is gone.

Prod has real data: 342 hackathons from the team's list (`source: "my-list"`), imported with `import-list`. The migration has to carry every existing value over, especially category links.

### Decisions

- **Owner comes from the accountable assignment.** `Hackathon.ownerId` copied `Assignment.accountable` through a second, separate `PATCH` (`assignTeam` in `lib/actions.ts`), so the board and the team page could disagree, and `PATCH` accepted an owner who wasn't on the team. Drop the column and the `owner` relation. The board card, the workspace header and the board's owner filter read the assignment with `accountable: true`.
- **`Team.preferredTech` goes.** Settings edits it, but nothing reads it: `fit.ts` scores on `preferredCats` and `homeCity`, and `tracks.ts` uses the project's tech.
- **Categories become a constant.** No route ever wrote them: only `prisma/categories.ts` did, from a constant. Move `CATEGORIES` to `packages/shared`, drop the `Category` model and its hidden join table `_CategoryToHackathon`, and store `Hackathon.categories` as a `text[]` of slugs, the same shape as `Team.preferredCats`. `upsertCategories` goes away.
- **Lists are Postgres arrays.** `Member.skills`, `Member.preferredRoles`, `Project.tech`, `Team.preferredCats` become `text[]`. `Hackathon.prizeTracks` becomes `jsonb`. `parseList` (`discovery/refresh.ts`), `jsonFields` (`team.controller.ts`) and the JSON parsing in `mappers.ts` go away. Enum-like strings stay strings checked by Zod. That part of the old comment still holds.
- **`result` only with `stage = 'results'`.** `changeStage` already enforces this. A database `CHECK` makes it a rule nothing can skip, including scripts.
- **The decision note is written with the stage change.** `moveCard` sent a `PATCH decisionNote`, then a separate `POST /stage` with the same note. `changeStage` now sets `decisionNote` in its own transaction when the move is to `registered` or `skipped` with a note. The column stays: the board and the overview show the current decision, and the activity log keeps the history. Reading it from the log would mean guessing which note row goes with which change row.
- **No `manual` source and no `POST /hackathons`.** Nothing in the web app calls it. Hackathons come from Devpost, MLH or the team's list (`import-list`). The three API test files that create fixtures through the route use `db.hackathon.create` instead.
- **`Task.order` is set only by the server.** It keeps the template order when a hackathon has no submission date (every `dueAt` is null), and `Task` has no `createdAt`, so the column stays. It's removed from the task input schema, because nothing in the web app sends it.
- **One `TEAM_ID` constant.** `Team` stays one row: each hackathon's lineup (3, 4 or 5 of the members) is its `Assignment` rows, not another team. Replace the 7 `"team"` strings with `TEAM_ID`. Move the `"Kuala Lumpur"` default of `homeCity` from the Prisma schema to the Zod schema.

### Kept after the audit

`Project` (the portfolio's links), `Task.order`, `decisionNote`, `eligibility` (shown on the overview since phase 14), `MemberSecret`, `Session`, `LoginFailure`, `Activity`, and the `my-list` source.

## Implementation

### 15.1 Migration
Files: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261128000000_schema_cleanup/migration.sql`.

Generate the schema change with `prisma migrate diff --from-migrations … --to-schema … --script` (no `migrate dev`: it can offer to reset). Then edit the SQL so data is carried over, in this order:

1. Add `Hackathon.categories text[] NOT NULL DEFAULT '{}'`, fill it from the join table, then drop the join table and `Category`. ⚠ Verify the join table's columns before writing the `UPDATE`: in Prisma's implicit many-to-many, `A` is the model whose name sorts first (`Category`) and `B` is `Hackathon`.
   ```sql
   UPDATE "Hackathon" h SET categories = ARRAY(
     SELECT c.slug FROM "_CategoryToHackathon" j JOIN "Category" c ON c.id = j."A" WHERE j."B" = h.id ORDER BY c.slug);
   ```
2. Convert each JSON list with `USING`, for example `ALTER COLUMN skills TYPE text[] USING ARRAY(SELECT jsonb_array_elements_text(skills::jsonb))`, then set the default to `'{}'`. `prizeTracks` becomes `jsonb USING "prizeTracks"::jsonb`, default `'[]'`.
3. Drop `Hackathon.ownerId` (foreign key first) and `Team.preferredTech`. Drop the database default on `Team.homeCity`.
4. `UPDATE "Hackathon" SET result = NULL WHERE stage <> 'results'`, then `ADD CONSTRAINT "Hackathon_result_needs_results_stage" CHECK (result IS NULL OR stage = 'results')`. ⚠ Verify that the next `migrate diff` doesn't try to drop the constraint, since Prisma doesn't model `CHECK`.

Before running it on prod, query prod read-only for rows the migration doesn't map: `source = 'manual'` (it won't parse after 15.2) and `result IS NOT NULL AND stage <> 'results'` (the migration clears these).
Check: `pnpm check`, which runs the migration in the `test` schema. Then `prisma migrate deploy` on dev, and the 342 hackathons still show their categories.

### 15.2 Shared
Files: `packages/shared/src/enums.ts` (`SOURCES` without `manual`, `CATEGORIES`, `TEAM_ID`), `schemas.ts` (no `ownerId`, `preferredTech` or task `order`; `HackathonInput` and its `source` default go with the route; `homeCity` defaults to `"Kuala Lumpur"`), `dto.ts`, tests.
Check: `pnpm --filter @hackops/shared build` and its tests.

### 15.3 API
Files: `mappers.ts` (arrays read as they are, `owner` from the accountable assignment, categories from `CATEGORIES` by slug), `hackathons.controller.ts` (owner and category filters, no `POST /hackathons`, no `ownerId` label), `stage.ts` (`decisionNote`), `team.controller.ts` (no `jsonFields`, `TEAM_ID`, `/categories` from the constant), `portfolio.controller.ts`, `discovery/refresh.ts` (no `parseList`, categories from the constant), `prisma/seed.ts`, `prisma/import-list.ts`, delete `prisma/categories.ts`, and test fixtures in `hackathons.test.ts`, `auth.test.ts` and `discovery.test.ts`.
Tests: a stage move to `registered` with a note sets `decisionNote`, and the database rejects `result` outside `results`.
Check: `pnpm check`.

### 15.4 Web
Files: `lib/actions.ts` (no `ownerId` or `decisionNote` `PATCH`), `settings/team-form.tsx` (no tech field), board and workspace header (owner), category readers (`board`, `discover`, `h/[id]`, `h/[id]/team`, `portfolio`).
Check: `pnpm --filter web typecheck`, `pnpm --filter web build`, `impeccable detect --json` on the changed files. Then sign in, move a card to Skipped with a note, and check the board, the overview, the team page and the portfolio.

### 15.5 Docs and prod
Files: `docs/README.md` (tick 15), this file's "As built", the comment at the top of `schema.prisma`, AGENTS.md (owner and categories).
Prod: Render's start runs `prisma migrate deploy`, so merging and deploying applies the migration. Run the read-only checks from 15.1 first, and make sure a Neon restore point is recent.

## Known limits

- ponytail: categories are a constant, so changing a keyword needs a commit and a deploy, and existing hackathons keep their old slugs until the next refresh or import. Upgrade: a settings screen backed by a table, if the team ever edits categories often.

## As built

- 15.1: Postgres refuses a subquery in `ALTER ... USING`, so the migration converts lists with a helper function `json_text_array` that it creates and then drops again. Checked on sample rows in a throwaway schema of dev: category links became slugs, every list kept its items, a stray `won` on a `building` row was cleared, and the check rejects a new one. After `migrate deploy`, `prisma migrate diff --from-config-datasource` against the schema is empty, so the unmodelled `CHECK` doesn't show up as drift. Not yet applied to dev's `public` schema: the app code still reads JSON strings until 15.2 to 15.4.
