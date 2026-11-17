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
- [ ] **Check:** a test on a saved gallery fixture.
- [ ] **Commit:** `feat: what wins here`

### Task 10.2: Prize-track finder
**Files:** `packages/shared/src/tracks.ts`.
- [ ] **Check:** tests for fits, maybe and no.
- [ ] **Commit:** `feat: prize-track finder`

### Task 10.3: Pre-submission check
**Files:** `apps/api/src/intel/submission-check.ts`, the Links & submission tab.
- [ ] **Check:** tests with a mocked `fetch` for each pass and fail case.
- [ ] **Commit:** `feat: pre-submission check`
