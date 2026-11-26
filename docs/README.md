# HackOps docs: start here

HackOps is the team's hackathon manager. It finds hackathons, runs each one as a small project through a light lifecycle, and turns every submission into a portfolio entry.

| File | What it is |
|---|---|
| [spec.md](spec.md) | **What** is being built and why: every decision from the planning session |
| [phases/00-scaffold.md](phases/00-scaffold.md) | pnpm workspace, `@hackops/shared`, NestJS API with health check and Prisma, Next.js web, GitHub repo |
| [phases/01-design-system-and-shell.md](phases/01-design-system-and-shell.md) | Visual direction from reference sites, tokens, type, outside SVG icons and logo, app shell and navigation |
| [phases/02-core-data-and-api.md](phases/02-core-data-and-api.md) | Prisma schema, seed data, REST endpoints, stage changes, activity log |
| [phases/03-discovery.md](phases/03-discovery.md) | Devpost, MLH and Malaysian sources, dedupe, auto-categories, fit score, daily refresh, Discover screen |
| [phases/04-pipeline-board.md](phases/04-pipeline-board.md) | The board across all hackathons: stages as columns, drag to move, filters, go/no-go |
| [phases/05-hackathon-workspace.md](phases/05-hackathon-workspace.md) | One workspace per hackathon: overview, tasks, team and roles, timeline, activity, links and submission, retro |
| [phases/06-team-and-responsibility.md](phases/06-team-and-responsibility.md) | Members, skills, workload, responsibility grid, member history |
| [phases/07-projects-and-portfolio.md](phases/07-projects-and-portfolio.md) | Projects and their links, linking to hackathons, the public portfolio page |
| [phases/08-deadlines-and-reminders.md](phases/08-deadlines-and-reminders.md) | Due-soon panel, `.ics` calendar feed |
| [phases/09-signup-assist.md](phases/09-signup-assist.md) | Team profile and the bookmarklet that fills registration forms |
| [phases/10-win-intelligence.md](phases/10-win-intelligence.md) | "What wins here", prize-track finder, pre-submission check |
| [phases/11-later.md](phases/11-later.md) | **Later, don't start.** AI hook, accounts, chat reminders, hosting |

## How to use the phases

- **Order:** work through the phases in number order. Phase 01 comes before the feature phases so every screen is built in the agreed look.
- **Each phase file has two halves:** **Design** (what the phase delivers and the decisions behind it) and **Implementation** (tasks with files, interfaces, steps, a check and a commit). Phase 00 is written out in full. Later phases list their tasks; each is expanded into exact steps at the start of the phase, after looking at what earlier phases actually produced.
- **Interfaces** blocks name what a task uses from earlier tasks and what it provides to later ones. If a name in the code differs from the plan, fix the plan.
- **⚠ Verify** marks a library API that may have changed since this was written (November 2026). Check the installed package's docs first.
- **Branches and commits:** phase 00 lands on `main`. Every later phase gets a branch `phase-NN-<name>` and a pull request. Commits use `feat(api): …`, `feat(web): …`, `feat(shared): …`, `chore: …`, `docs: …`.
- **Picking up again (you or Claude):** read this file, find the first unticked box, open that phase at that task, and run `git log --oneline -5`.

## Build rules (the "ponytail" approach)

Take the simplest version that works. Before writing anything, go down this list and stop at the first that holds:

1. **Does it need to exist?** If it's for a "maybe later", skip it.
2. **Is it already here?** Use what's in `@hackops/shared` or the app first.
3. **Do Node, the browser, the platform or an installed package already do it?** Use that before adding a dependency. A native `<input type="date">` beats a date-picker library.
4. **Only then**, write the smallest code that does the job.

Concretely:
- One Nest module (`AppModule`). No interface with one implementation, no factory for one product, no setting for a value that never changes.
- One test per real rule. No tests for plain wiring.
- When a simplification has a known limit, mark it with a `ponytail:` comment naming the limit and the upgrade path.
- Never cut corners on: validation at the API boundary, escaping scraped text before showing it, rate limits on scrapers, and anything that submits a form in the team's name.

## UI rules

- Every UI phase uses the **impeccable** and **ui-ux-pro-max** skills, against the direction set in phase 01.
- No generic AI look: no purple-gradient heroes, no glassmorphism cards inside cards, no emoji as icons, no default shadcn look left untouched.
- Icons and the logo come from outside SVG files, not a React icon package.

## Progress

### 00 Scaffold
- [x] 0.1 pnpm workspace and root files
- [x] 0.2 `@hackops/shared` package with one tested function
- [x] 0.3 NestJS API: health endpoint, Prisma on SQLite
- [x] 0.4 Next.js web reading the API health
- [x] 0.5 Public repo on GitHub and first push

### 01 Design system and shell
- [x] 1.1 Reference sites studied, direction written down
- [x] 1.2 Tokens, type, colour, light and dark
- [x] 1.3 Logo and icon set imported as SVG
- [x] 1.4 App shell: navigation, page header, empty states

### 02 Core data and API
- [x] 2.1 Prisma schema and migration
- [x] 2.2 Shared Zod schemas, enums and DTOs
- [x] 2.3 Seed data
- [x] 2.4 REST endpoints with validation
- [x] 2.5 Stage changes, task template, activity log (with tests)

### 03 Discovery
- [x] 3.1 Source fetchers: Devpost, MLH, Malaysian list
- [x] 3.2 Dedupe and auto-categories (with tests)
- [x] 3.3 Fit score (with tests)
- [x] 3.4 Refresh endpoint and daily schedule
- [x] 3.5 Discover screen

### 04 Pipeline board
- [x] 4.1 Board endpoint
- [x] 4.2 Board screen with drag to move
- [x] 4.3 Filters and go/no-go

### 05 Hackathon workspace
- [x] 5.1 Workspace layout and overview
- [x] 5.2 Tasks
- [x] 5.3 Team and roles
- [x] 5.4 Timeline
- [x] 5.5 Activity and notes
- [x] 5.6 Links and submission
- [x] 5.7 Retro

### 06 Team and responsibility
- [x] 6.1 Members screen
- [x] 6.2 Workload (with tests)
- [x] 6.3 Responsibility grid
- [x] 6.4 Member history

### 07 Projects and portfolio
- [x] 7.1 Projects screen and linking
- [x] 7.2 Public portfolio page

### 08 Deadlines and reminders
- [x] 8.1 Due-soon endpoint and panel (with tests)
- [x] 8.2 Calendar feed

### 09 Sign-up assist
- [ ] 9.1 Team profile
- [ ] 9.2 Bookmarklet (with tests)

### 10 Win intelligence
- [x] 10.1 "What wins here" (with tests)
- [x] 10.2 Prize-track finder (with tests)
- [x] 10.3 Pre-submission check (with tests)

### 11 Later (don't start yet)
- [ ] 11.1 AI hook
- [ ] 11.2 Accounts, reminders in chat, hosting
