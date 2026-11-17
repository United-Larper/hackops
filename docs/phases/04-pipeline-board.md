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
- [x] Returns cards grouped by stage, with progress and next deadline worked out in one query plus `@hackops/shared` helpers (`packages/shared/src/board.ts`). Next deadline per stage: Interested watches registration then submission, Registered and Building watch submission, Submitted watches judging, Results none. Filters: `category`, `owner`, `region`, `mode` (hybrid counts as both), `week=1`, `skipped=1`.
- [x] **Commit:** `feat(api): board endpoint`

### Task 4.2: Board screen
**Files:** `apps/web/app/(app)/board/*`.
- [x] Built with impeccable and ui-ux-pro-max. Optimistic move, rolled back if the API refuses.
- [x] **Check:** drag and keyboard move both work; a refused move snaps back with a message; horizontal scroll on phones.
- [x] **Commit:** `feat(web): pipeline board`

### Task 4.3: Filters and go/no-go
**Files:** same folder.
- [x] Filters live in the URL query so a filtered board can be shared.
- [x] **Commit:** `feat(web): board filters and go/no-go`

### As built
- 4.2 and 4.3 share their files, so they landed as one commit: `feat(web): pipeline board, filters and go/no-go`.
- Moves: native drag (cards carry an `application/x-hackops-card` drag type) plus a **Move** menu on every card, a native `popover` anchored with CSS anchor positioning (centred fallback without it). Optimistic through `useOptimistic`; a refused move falls back to the server's board and the status line names the reason.
- Moving Interested to Registered or Skipped, by drag or menu, opens the **Decide** dialog; its note is saved as `decisionNote` and logged. Moving to Results opens a W/F/P picker.
- **Show skipped** adds a sixth column; cards can be dragged back out.
- Cards link to `/board/[id]`, a placeholder that phase 05 replaces with the workspace.
- `@dnd-kit` not added: the Move menu is the touch and keyboard path. Revisit only if phone drag is reported unusable.
