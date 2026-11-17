# 02: Core data and API

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md).

## Design

**Goal:** the data every later phase reads and writes, behind a validated REST API.

**Decisions:**
- SQLite has no enum or list columns. Enums are `String` columns checked by Zod at the API boundary; lists (skills, prize tracks) are JSON strings parsed in one helper.
- Times are UTC `DateTime`. The web formats them in `Asia/Kuala_Lumpur`.
- Prize amounts are `Int` (whole units) plus a `currency` string.
- The lifecycle phase is derived from the stage in `@hackops/shared` (spec §5), never stored.
- Every change to a hackathon writes an `Activity` row in the same transaction.

**Schema** (⚠ Verify the Prisma 7 generator and adapter syntax against the installed docs):

```prisma
model Hackathon {
  id                    String    @id @default(cuid())
  source                String    // devpost | mlh | my-list | manual
  sourceId              String?
  title                 String
  url                   String
  organizer             String?
  mode                  String    // online | in_person | hybrid
  city                  String?
  country               String?
  startsAt              DateTime?
  endsAt                DateTime?
  registrationClosesAt  DateTime?
  submissionDueAt       DateTime?
  judgingAt             DateTime?
  prizeAmount           Int?
  prizeCurrency         String?
  teamSizeMax           Int?
  eligibility           String?
  prizeTracks           String    @default("[]") // JSON array of { name, sponsor?, prize? }
  stage                 String    @default("discovered")
  decisionNote          String?
  result                String?   // won | finalist | participated
  resultNote            String?
  retroWentWell         String?
  retroToChange         String?
  ownerId               String?
  owner                 Member?   @relation("owner", fields: [ownerId], references: [id])
  projectId             String?
  project               Project?  @relation(fields: [projectId], references: [id])
  categories            Category[]
  assignments           Assignment[]
  tasks                 Task[]
  activity              Activity[]
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@unique([source, sourceId])
}

model Category {
  id         String      @id @default(cuid())
  slug       String      @unique
  name       String
  keywords   String      @default("[]")
  hackathons Hackathon[]
}

model Member {
  id             String       @id @default(cuid())
  name           String
  email          String?
  githubUrl      String?
  linkedinUrl    String?
  skills         String       @default("[]")
  preferredRoles String       @default("[]")
  organisation   String?
  tshirtSize     String?
  dietary        String?
  owned          Hackathon[]  @relation("owner")
  assignments    Assignment[]
  tasks          Task[]
  activity       Activity[]
}

model Assignment {
  hackathonId  String
  memberId     String
  role         String    // lead | developer | designer | pitch
  accountable  Boolean   @default(false)
  hackathon    Hackathon @relation(fields: [hackathonId], references: [id], onDelete: Cascade)
  member       Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  @@id([hackathonId, memberId])
}

model Task {
  id          String    @id @default(cuid())
  hackathonId String
  title       String
  status      String    @default("todo") // todo | doing | done
  assigneeId  String?
  dueAt       DateTime?
  order       Int       @default(0)
  hackathon   Hackathon @relation(fields: [hackathonId], references: [id], onDelete: Cascade)
  assignee    Member?   @relation(fields: [assigneeId], references: [id])
}

model Project {
  id          String      @id @default(cuid())
  name        String
  description String?
  tech        String      @default("[]")
  repoUrl     String?
  demoUrl     String?
  videoUrl    String?
  slidesUrl   String?
  devpostUrl  String?
  hackathons  Hackathon[]
}

model Activity {
  id          String    @id @default(cuid())
  hackathonId String
  memberId    String?
  kind        String    // change | note
  text        String
  createdAt   DateTime  @default(now())
  hackathon   Hackathon @relation(fields: [hackathonId], references: [id], onDelete: Cascade)
  member      Member?   @relation(fields: [memberId], references: [id])
}

model Team {
  id             String  @id @default("team")
  name           String
  pitch          String?
  preferredTech  String  @default("[]")
  preferredCats  String  @default("[]")
  homeCity       String  @default("Kuala Lumpur")
}
```

**Endpoints** (all JSON, all inputs validated by Zod from `@hackops/shared`):

| Method | Path | Does |
|---|---|---|
| GET | `/hackathons?stage=&category=&region=&q=` | list with filters |
| POST | `/hackathons` | add by hand |
| GET | `/hackathons/:id` | workspace payload (hackathon, categories, assignments, tasks, project, latest activity) |
| PATCH | `/hackathons/:id` | update fields |
| POST | `/hackathons/:id/stage` | change stage (side effects in task 2.5) |
| POST/PATCH/DELETE | `/hackathons/:id/tasks[/:taskId]` | tasks |
| PUT | `/hackathons/:id/team` | replace assignments |
| POST | `/hackathons/:id/notes` | add a note to the activity feed |
| GET/POST/PATCH/DELETE | `/members[/:id]` | members |
| GET/POST/PATCH/DELETE | `/projects[/:id]` | projects |
| GET | `/categories` | categories |
| GET/PUT | `/team` | team profile |

## Implementation

> **As built (2026-11-17):** done on branch `phase-02-core-data`. Differences from the plan below:
> - `source` gained a `demo` value; every seeded hackathon uses it so later screens can label demo data.
> - The seed has three projects (Kedai Kira, Banjir Watch, LearnLah) and eleven hackathons, dated relative to now so deadlines stay live. Run it with `pnpm --filter api db:seed`; `db:reset` wipes and reseeds.
> - The template has seven tasks (`TASK_TEMPLATE` in `@hackops/shared`); due dates in the past are clamped to now.
> - Prisma's "not found", "bad reference" and "duplicate" errors become 404, 400 and 409 through one exception filter (`src/common/prisma-errors.filter.ts`).
> - JSON list columns are parsed in `src/mappers.ts`; the API returns arrays.
> - Tests run against `prisma/test.db`, rebuilt from the migrations on every run (`test/global-setup.ts`).

### Task 2.1: Prisma schema and migration
**Files:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/*`.
- [x] Add the models above to the phase 00 schema (generator and datasource stay as they are). Run `pnpm --filter api exec prisma migrate dev --name core`.
- [x] **Check:** migration applies on a fresh `dev.db`.
- [x] **Commit:** `feat(api): core data model`

### Task 2.2: Shared schemas
**Files:** `packages/shared/src/enums.ts`, `schemas.ts`, `dto.ts` (`lifecycle.ts` with `STAGES` and `phaseOf` already exists from phase 00).
**Interfaces:** produces `STAGES`, `ROLES`, `MODES`, `phaseOf(stage)`, the Zod input schemas named `<Thing>Input`, and DTO types named `<Thing>Dto`.
- [x] Write them. Test `phaseOf` for every stage.
- [x] **Commit:** `feat(shared): enums, schemas, DTOs, lifecycle`

### Task 2.3: Seed data
**Files:** `apps/api/prisma/seed.ts`.
- [x] Seed the categories (AI/ML, Web3, FinTech, HealthTech, Sustainability, EdTech, Gaming, Open theme, Student only, Corporate) with keywords, four demo members, the team row, two projects and about eight hackathons across every stage, half in Malaysia.
- [x] **Check:** `pnpm --filter api db:seed` runs twice without duplicates.
- [x] **Commit:** `feat(api): demo seed`

### Task 2.4: REST endpoints
**Files:** `apps/api/src/hackathons.controller.ts`, `members.controller.ts`, `projects.controller.ts`, `team.controller.ts`, `common/zod.pipe.ts`.
- [x] Controllers call Prisma directly (no service layer for plain reads and writes).
- [x] **Check:** a supertest per controller for one happy path and one rejected input.
- [x] **Commit:** `feat(api): REST endpoints`

### Task 2.5: Stage changes and activity
**Files:** `apps/api/src/stage.ts`, `packages/shared/src/task-template.ts`.
- [x] Moving to `registered` creates the template tasks with due dates counted back from `submissionDueAt`. Moving to `results` requires a `result`. Every change writes an `Activity` row in the same transaction.
- [x] **Check:** tests for the template creation, the result rule and the activity row.
- [x] **Commit:** `feat(api): stage changes and activity log`
