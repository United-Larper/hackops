# 10: Win intelligence

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md).

## Design

**Goal:** raise the win rate by picking well, building toward what judges reward, and not losing points on avoidable mistakes. All three run without AI.

### "What wins here"
- For Devpost hackathons: fetch the project gallery of **past editions by the same organizer** (winners only), and count the "built with" tech, the themes and team sizes.
- Shown on the workspace overview and in Discover: "Past winners mostly used: Python, OpenAI, React · average team of 3 · 4 of 6 had a demo video".
- Cached per organizer for a week. One fetch per gallery page, same scraper rules as phase 03.
- Non-Devpost events show "No past data" instead of guessing.

### Prize-track finder
- Prize tracks come from the source (Devpost lists them) or are typed in by hand.
- Each track's text is keyword-matched against the linked project's tech and the event's categories, then labelled "fits", "maybe" or "no".
- Shows how many tracks one project could enter at once.

### Pre-submission check
Runs on the Links & submission tab, and on its own 6 hours before `submissionDueAt` (listed in the due-soon panel if anything fails).

| Check | How |
|---|---|
| Repo is public | GitHub API `GET /repos/:owner/:repo` without a token (60 requests per hour is enough) |
| README is not empty | GitHub API README endpoint, length over 300 characters |
| Demo video linked | `videoUrl` set and responds |
| Demo link works | `demoUrl` responds with 2xx or 3xx |
| Checklist done | all template tasks done |
| Prize tracks chosen | at least one track marked "entering" |

## Implementation

### Task 10.1: "What wins here"
**Files:** `apps/api/src/intel/past-winners.ts`, `packages/shared/src/winners.ts`.
- [x] **Check:** a test on a saved gallery fixture.
- [x] **Commit:** `feat: what wins here`

### Task 10.2: Prize-track finder
**Files:** `packages/shared/src/tracks.ts`.
- [x] **Check:** tests for fits, maybe and no.
- [x] **Commit:** `feat: prize-track finder`

### Task 10.3: Pre-submission check
**Files:** `apps/api/src/intel/submission-check.ts`, the Links & submission tab.
- [x] **Check:** tests with a mocked `fetch` for each pass and fail case.
- [x] **Commit:** `feat: pre-submission check`

## As built

- **Decisions (user-approved at the start of the phase):** Devpost's winners gallery lists winners and their team members, but "built with" and the video are only on each project's page. So a brief reads up to 3 past editions and 6 winners each: 1 listing + 3 galleries + up to 18 project pages, one at a time with a 500 ms pause, cached a week per organizer. Prize tracks come from an **Import from Devpost** button (one fetch), never from the daily refresh. The refresh no longer writes `prizeTracks`, so typed tracks and "entering" marks survive it.
- **Devpost and Cloudflare:** Devpost's Cloudflare challenges a non-browser that asks for `text/html` (403); the same request with `accept: */*` (what curl sends) passes. `robots.txt` on devpost.com and the event subdomains disallows nothing for `*`. The user chose to send `*/*` with the honest HackOps User-Agent (`HTML` in `apps/api/src/intel/past-winners.ts`). If Devpost starts blocking properly, the overview says Devpost didn't answer and nothing is cached.
- **What wins here:** `apps/api/src/intel/past-winners.ts` finds ended editions through `devpost.com/api/hackathons?status[]=ended&organization=`, then parses galleries (`?winners=true` lists winners first; team size counts member photos, so anonymous members count), project pages ("Built with" tags, video embed) and event prizes. Only `https://*.devpost.com` URLs are fetched. `summariseWinners` and `briefLine` are in `packages/shared/src/winners.ts`. `GET /hackathons/:id/winners` returns `{ organizer, brief }`, with brief null for non-Devpost events or organizers without past winners ("No past data"). `GET /hackathons/winners` returns cached briefs only. The workspace overview streams the panel under Suspense (about 20 s the first time per organizer). Discover shows the cached line, a "See what wins here" link for unfetched Devpost events, and "No past data" otherwise. The cache is in memory (`ponytail:`).
- **Prize-track finder:** `trackFit` in `packages/shared/src/tracks.ts`: "fits" when the track's name, sponsor or description names the project's tech; "maybe" for an event category's name or keywords, or a placement prize; "no" otherwise. Whole-word match (`ponytail:`). Tracks gained `description` and `entering`. The workspace DTO carries each track's `fit`, computed in `toWorkspaceDto`. The overview's **Prize tracks** panel shows fits / maybe / entering counts and has an "Entering" checkbox per track, remove, add by hand, and Import from Devpost. `POST /hackathons/:id/tracks/import` keeps existing tracks (same name) with their text and mark.
- **Pre-submission check:** `apps/api/src/intel/submission-check.ts`. Repo public and README over 300 characters through the GitHub API without a token; video and demo links count as working on 2xx or 3xx, without following redirects; checklist = template tasks except "Submit" (it can't be done before submitting); at least one track entering. A repo off GitHub or GitHub's hourly limit gives "Can't tell", not a fail. `GET /hackathons/:id/check` runs it; the Links & submission tab streams it with **Check again**. `SubmissionCheckService` runs hourly for Registered and Building events due within 6 hours; a failing hackathon appears in the due-soon panel as "Pre-submission check failing" at its submission deadline, linking to the Links tab. The last result per hackathon is kept in memory (`ponytail:`).
- **Tests:** shared 43 (winners, track fit, the check item in due-soon), api 39. `apps/api/src/intel/intel.test.ts` parses the saved Devpost fixtures (`test/fixtures/devpost-gallery.html`, `devpost-project.html`, `devpost-event.html`, saved 2026-11-26), runs every check case against a mocked `fetch`, imports tracks, and lists a failing check in `/deadlines`.
- **Design:** impeccable (Operate, inside the Matchday world) with ui-ux-pro-max rules; its search script needs Python, which this machine lacks, so its built-in checklist was used. Check marks are result-style squares: pass green with a tick, fail ink with a cross, can't-tell outlined, each with a word for screen readers; signal red stays reserved. `impeccable detect` is clean on every changed file.
- **Not done:** no browser test of the client interactions (toggle, add, import buttons); they go through the same PATCH and import endpoints the API tests cover.
