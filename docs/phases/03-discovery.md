# 03: Discovery

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md).

## Design

**Goal:** a steady flow of relevant hackathons, in Malaysia and overseas, without anyone searching by hand.

**Sources:**

| Source | How | Notes |
|---|---|---|
| Devpost | Its public JSON listing (`devpost.com/api/hackathons`, ⚠ Verify the path and fields) | Has themes, prize totals, online or in person, dates |
| MLH | The season events page, parsed as HTML | Mostly student events, US and Europe, some APAC |
| Malaysian list | A curated JSON file in the repo (`apps/api/data/my-hackathons.json`) plus manual entries | Local events (MDEC, Cradle, universities, GDG, AWS user groups) rarely have a feed. The team adds them in the app or edits the file |

Later sources (Devfolio, Luma, Eventbrite, Taikai) follow the same fetcher shape and can be added one at a time.

**Rules:**
- One fetch per source per refresh, a clear `User-Agent` naming the app, a 10-second timeout, and each source's robots.txt and terms respected. A failing source is logged and skipped; the others continue.
- **Dedupe:** by `(source, sourceId)` first; across sources by a normalised title plus start date.
- **Auto-categories:** keyword match of title, themes and description against each category's keywords. Editable afterwards; a hand edit is never overwritten by a refresh.
- **Region:** `country = Malaysia` or a Malaysian city means Malaysia; anything else is overseas; `online` is its own filter.
- **Fit score:** spec §7, computed on read so it always uses the current team profile.
- Scraped text is stored as plain text and escaped when rendered.

**Discover screen:** a list (not the board) of `discovered` hackathons, sorted by fit score, filters for category, region, online or in person, and "closes within". Each row shows the score with its reasons, the next deadline as a countdown and the prize. Actions: **Interested** (moves to the board) and **Skip**.

## Implementation

> **As built (2026-11-17):** done on branch `phase-03-discovery`. Differences from the plan below:
> - **Devpost:** `devpost.com/api/hackathons` works but is undocumented. It needs `per_page=40` (otherwise 9 per page); up to 5 sequential pages cover the ~154 open events. Dates come only as text ("Oct 30 - Dec 04, 2026"), so the deadline is taken as 23:59 US Eastern on the end date; the event page has the exact time. In-person locations are venue names, so most in-person Devpost events land as "overseas".
> - **MLH:** the season page embeds its data as JSON (`<script data-page="app">`), which is parsed instead of the markup: exact start and end times, city and an ISO country code. Events are tagged "student" and capped at four per team.
> - **Malaysian list:** `apps/api/data/my-hackathons.json` ships empty. Real local events aren't invented; add entries in the `HackathonInput` shape plus a `sourceId`. Two clearly labelled demo Malaysian events were added to the seed so the Malaysia filter has something to show.
> - **Manners:** `robots.txt` on both sites allows these paths. Requests are sequential with a named User-Agent and a 10 s timeout.
> - **Validation:** every scraped item goes through `HackathonInput` before it's stored; unsafe links are counted as invalid and dropped.
> - **Refreshes** update source facts (dates, prize, link) but never stage, categories or notes. Concurrent refreshes share one run.
> - **Fit** is computed on every read (`fit` on each hackathon DTO). The list endpoint gained `open=1`, `closesWithin=<days>` and `sort=fit|deadline|created`.
> - EdTech keywords were narrowed: "learning" also matched "Machine Learning".

### Task 3.1: Source fetchers
**Files:** `apps/api/src/discovery/devpost.ts`, `mlh.ts`, `my-list.ts`, `apps/api/data/my-hackathons.json`.
**Interfaces:** each exports `fetch(): Promise<ScrapedHackathon[]>`; `ScrapedHackathon` lives in `@hackops/shared`.
- [x] Write each fetcher against a saved sample response in `apps/api/test/fixtures/` so tests don't touch the network.
- [x] **Check:** a parse test per source against its fixture.
- [x] **Commit:** `feat(api): discovery sources`

### Task 3.2: Dedupe and auto-categories
**Files:** `packages/shared/src/discovery.ts`.
- [x] `normaliseTitle`, `isSameEvent`, `categorise(text, categories)`.
- [x] **Check:** tests for cross-source duplicates and for keyword tagging.
- [x] **Commit:** `feat(shared): dedupe and auto-categories`

### Task 3.3: Fit score
**Files:** `packages/shared/src/fit.ts`.
**Interfaces:** `fitScore(hackathon, team, now) → { score: number, reasons: string[] }`.
- [x] **Check:** tests: closed registration scores 0, an online AI event for an AI team scores high, overseas in-person scores lower than the same event in KL.
- [x] **Commit:** `feat(shared): fit score`

### Task 3.4: Refresh endpoint and schedule
**Files:** `apps/api/src/discovery/refresh.ts`, `discovery.controller.ts`.
- [x] `POST /discovery/refresh` runs every source and upserts; returns counts per source. `@nestjs/schedule` runs it daily at 08:00 Malaysia time. ⚠ Verify the `@Cron` time zone option.
- [x] **Check:** a test that a second refresh adds nothing.
- [x] **Commit:** `feat(api): discovery refresh and schedule`

### Task 3.5: Discover screen
**Files:** `apps/web/app/(app)/discover/*`.
- [x] Built with impeccable and ui-ux-pro-max against the phase 01 direction.
- [x] **Check:** Refresh fills the list; filters work; Interested moves the card to the board; works at 375 px.
- [x] **Commit:** `feat(web): discover screen`
