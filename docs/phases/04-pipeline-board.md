# 04: Pipeline board

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md).

## Design

**Goal:** one view of every hackathon the team is pursuing, from Interested to Results. This is the team's set of hackathons seen together, each card being one project.

**Columns:** Interested → Registered → Building → Submitted → Results. `discovered` lives in Discover; `skipped` is hidden behind a filter.

**Each card shows:** title, the next deadline as a countdown in its urgency colour, the owner's initials, category chips, a progress bar (done tasks out of all tasks) and the fit score. Clicking a card opens its workspace (phase 05).

**Moving cards:** drag between columns, or use a keyboard menu on the card. A move calls `POST /hackathons/:id/stage`, so the side effects from phase 02 apply. Moving to Results asks for the result first.

**Drag and drop:** native HTML drag-and-drop events plus the keyboard menu, before reaching for a library. If touch dragging on phones turns out unusable, add `@dnd-kit` then and mark it with a `ponytail:` comment.

**Go/no-go:** a card in Interested has a "Decide" action: register (with a decision note) or skip (with a reason). The note is kept on the workspace overview.

**Filters:** category, owner, region, online or in person, "has a deadline this week".

## Implementation

### Task 4.1: Board endpoint
**Files:** `apps/api/src/hackathons.controller.ts` (a `GET /board` route).
- [ ] Returns cards grouped by stage, with progress and next deadline worked out in one query plus `@hackops/shared` helpers.
- [ ] **Commit:** `feat(api): board endpoint`

### Task 4.2: Board screen
**Files:** `apps/web/app/(app)/board/*`.
- [ ] Built with impeccable and ui-ux-pro-max. Optimistic move, rolled back if the API refuses.
- [ ] **Check:** drag and keyboard move both work; a refused move snaps back with a message; horizontal scroll on phones.
- [ ] **Commit:** `feat(web): pipeline board`

### Task 4.3: Filters and go/no-go
**Files:** same folder.
- [ ] Filters live in the URL query so a filtered board can be shared.
- [ ] **Commit:** `feat(web): board filters and go/no-go`
