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

### Task 3.1: Source fetchers
**Files:** `apps/api/src/discovery/devpost.ts`, `mlh.ts`, `my-list.ts`, `apps/api/data/my-hackathons.json`.
**Interfaces:** each exports `fetch(): Promise<ScrapedHackathon[]>`; `ScrapedHackathon` lives in `@hackops/shared`.
- [ ] Write each fetcher against a saved sample response in `apps/api/test/fixtures/` so tests don't touch the network.
- [ ] **Check:** a parse test per source against its fixture.
- [ ] **Commit:** `feat(api): discovery sources`

### Task 3.2: Dedupe and auto-categories
**Files:** `packages/shared/src/discovery.ts`.
- [ ] `normaliseTitle`, `isSameEvent`, `categorise(text, categories)`.
- [ ] **Check:** tests for cross-source duplicates and for keyword tagging.
- [ ] **Commit:** `feat(shared): dedupe and auto-categories`

### Task 3.3: Fit score
**Files:** `packages/shared/src/fit.ts`.
**Interfaces:** `fitScore(hackathon, team, now) → { score: number, reasons: string[] }`.
- [ ] **Check:** tests: closed registration scores 0, an online AI event for an AI team scores high, overseas in-person scores lower than the same event in KL.
- [ ] **Commit:** `feat(shared): fit score`

### Task 3.4: Refresh endpoint and schedule
**Files:** `apps/api/src/discovery/refresh.ts`, `discovery.controller.ts`.
- [ ] `POST /discovery/refresh` runs every source and upserts; returns counts per source. `@nestjs/schedule` runs it daily at 08:00 Malaysia time. ⚠ Verify the `@Cron` time zone option.
- [ ] **Check:** a test that a second refresh adds nothing.
- [ ] **Commit:** `feat(api): discovery refresh and schedule`

### Task 3.5: Discover screen
**Files:** `apps/web/app/(app)/discover/*`.
- [ ] Built with impeccable and ui-ux-pro-max against the phase 01 direction.
- [ ] **Check:** Refresh fills the list; filters work; Interested moves the card to the board; works at 375 px.
- [ ] **Commit:** `feat(web): discover screen`
