# HackOps: design spec

Status: agreed in the planning session of 2026-11-17. Each phase file in [phases/](phases/) holds that phase's design and its build steps. Progress is tracked in [README.md](README.md).

This document records **what** is being built and **why**.

---

## 1. Why

The team wants to enter **more hackathons**, to gain experience, build a portfolio and have a fair shot at winning. Nothing is broken today. The system exists to:

1. **Keep the pipeline full:** find events in Malaysia and overseas without anyone having to search for them.
2. **Make each entry cheap to run:** setup takes minutes, not an evening of admin.
3. **Turn every entry into portfolio material:** each submission becomes a public record the team can link from CVs and LinkedIn.
4. **Get better at winning:** pick events where the team fits, and learn from each result.

This is a **demo**. One shared team, running locally. Each member signs in with their own email and password (phase 12); the portfolio stays public.

## 2. Goals, non-goals, anti-goals

**Goals**
- Discover hackathons automatically (Devpost, MLH, a curated Malaysian list), sorted by category, with a fit score.
- Run every hackathon as a small project through a light lifecycle: Initiation → Planning → Execution → Monitoring → Closing.
- Give each hackathon its own **workspace**: overview, tasks, team and roles, timeline, activity, links and submission, retro.
- Team and responsibility management across all hackathons: skills, workload, who owns what.
- Projects with links, linkable to one or more hackathons.
- A public **portfolio page** built automatically from submitted hackathons.
- Deadline reminders: a due-soon panel and a calendar feed.
- Sign-up assist: a team profile plus a bookmarklet that fills registration forms.
- Win intelligence: a "what wins here" brief from past winners, a prize-track finder and a pre-submission check.
- Per-member sign-in (phase 12): email and password, no roles. Every change is recorded under who made it.

**Non-goals (for the demo)**
- Roles and permissions, multiple teams, password reset by email (a teammate runs `set-password` instead).
- Chat bots (Telegram, Discord, WhatsApp) and email reminders.
- AI features. One optional hook is left for later (phase 11).
- Hosting. Everything runs on the developer's machine.

**Anti-goals (a failure even if it works)**
- **Process that slows the team down mid-hackathon.** Hackathons last 24 to 72 hours. Phases move by themselves when the stage changes; nobody fills in forms to move between them.
- **Submitting forms behind the user's back.** Sign-up assist fills fields; a human always clicks submit. No CAPTCHA solving, no stored passwords for third-party sites.
- **Generic "AI-made" UI.** The interface gets a deliberate visual direction (phase 01).
- **A scraper that hammers sites.** At most one fetch per source per refresh, and the robots.txt and terms of each source are respected.

## 3. Decisions

| Area | Decision |
|---|---|
| Repo | pnpm workspace, public on GitHub at `United-Larper/hackops` |
| Toolchain | Node 24 LTS, pnpm 10, TypeScript 5.8+ |
| Web | Next.js 16 (App Router), React 19, Tailwind CSS 4, in `apps/web`, port **3200** |
| API | NestJS 11 on Express, in `apps/api`, port **4000**. One `AppModule`, built with SWC |
| Shared | `@hackops/shared`: Zod 4 schemas, enums, DTO types and pure functions (fit score, lifecycle phase, checks), used by both apps |
| Database | SQLite through Prisma 7 (`@prisma/adapter-better-sqlite3`). One file, `apps/api/prisma/dev.db`. Swapping to Postgres later is a change of adapter and URL |
| Validation | Zod schemas from `@hackops/shared`, through one `ZodPipe` at the API boundary |
| Web ↔ API | Server components read from the API with `fetch`; server actions write through it. `API_URL` env var |
| Tests | Vitest. One test per real rule (fit score, phase mapping, dedupe, checks). No tests for plain wiring |
| Times | Stored in UTC, shown in **Malaysia time (Asia/Kuala_Lumpur)** |
| Money | Prize amounts stored as an integer plus a currency code, as listed by the source. No conversion in the demo |
| Icons and logo | **No React icon library** (no `lucide-react` and similar). Icons and the logo are SVG files from an outside source (picked in phase 01), placed in `apps/web/public` |
| Discovery schedule | A "Refresh" button, plus a daily run through `@nestjs/schedule` while the API is running |
| Reminders | In-app due-soon panel and an `.ics` calendar feed that Google Calendar or Outlook can subscribe to |

## 4. Repository layout

```
hackops/
├─ apps/
│  ├─ web/          Next.js: every screen
│  └─ api/          NestJS: REST API, scrapers, schedule, Prisma
├─ packages/
│  └─ shared/       @hackops/shared
├─ docs/
│  ├─ README.md     index, build rules, progress
│  ├─ spec.md       this file
│  └─ phases/       one file per phase: design + implementation
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

## 5. The lifecycle

Every hackathon has a **stage**. The lifecycle **phase** is derived from the stage, never stored.

| Stage | Phase | What happens |
|---|---|---|
| `discovered` | Initiation | Found by a scraper or added by hand. Shown in Discover, not on the board |
| `interested` | Initiation | Go/no-go: fit score, "what wins here", a decision note |
| `registered` | Planning | Roles picked, idea and prize tracks chosen, milestones set from the event dates |
| `building` | Execution, Monitoring | Task board, progress notes, links, workload, pre-submission check |
| `submitted` | Closing | Project links frozen into the portfolio |
| `results` | Closing | Result recorded (won, finalist, participated), retro written |
| `skipped` | (none) | Decided not to enter. Kept so it isn't rediscovered |

Moving to `registered` creates the standard task list (form team, create repo, build MVP, record demo, write README, submit) from a template the team can edit.

## 6. Data model (summary)

Full Prisma schema in [phases/02-core-data-and-api.md](phases/02-core-data-and-api.md).

- **Hackathon**: source and source id (for dedupe), title, url, organizer, mode (online, in person, hybrid), city, country, dates (starts, ends, registration closes, submission due, judging), prize amount and currency, team size limit, eligibility notes, prize tracks, stage, decision note, result, retro, owner, linked project, categories.
- **Category**: name, slug, keywords used for auto-tagging.
- **Member**: name, email, links, skills, preferred roles, and the sign-up profile fields (organisation, T-shirt size, dietary needs).
- **Assignment**: a member on a hackathon with a role (`lead`, `developer`, `designer`, `pitch`) and an `accountable` flag (exactly one per hackathon submits).
- **Task**: belongs to a hackathon; title, status (`todo`, `doing`, `done`), assignee, due date, order.
- **Project**: name, description, tech, repo, demo, video, slides and Devpost links. Linked to many hackathons.
- **Activity**: a hackathon's feed: automatic change entries and manual notes.
- **Team**: one row: team name, pitch blurb, preferred tech, home city. Feeds the fit score and the sign-up assist.
- **MemberSecret**: one per member, kept apart from Member so a Member row can never leak it: scrypt password hash, the two-step sign-in key and the last code step used, and the member's own bookmarklet and calendar-feed token.
- **Session**: a signed-in browser. Only the SHA-256 of the token is stored; the token lives in an httpOnly cookie. 14 days.

## 7. Fit score

A pure function in `@hackops/shared`, 0 to 100, with the reasons shown next to the score:

- category overlap with the team's preferred tech and categories
- prize size
- reachability: online, or in person within Malaysia, or overseas (lower)
- time left before registration closes (none left means 0)
- team size limit versus team size

The weights are constants in one file. Phase 11 can replace this with AI ranking.

## 8. What the demo leaves for later

Phase 11 is the list: AI hook (idea generator, smarter prize parsing, written "what wins here"), accounts, chat and email reminders, hosting on Vercel with Postgres.
