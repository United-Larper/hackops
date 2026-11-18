# 06: Team and responsibility

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md).

## Design

**Goal:** see the whole team across every hackathon: who can do what, who's stretched, who owns what.

- **Members:** name, links, skills, preferred roles, and the sign-up profile fields (phase 09 uses them). Add, edit, remove.
- **Workload:** per member, the number of active hackathons (Registered or Building) and open tasks, with a warning when a new assignment overlaps another active event's dates. Shown as a simple bar per member, no chart library.
- **Responsibility grid:** rows are members, columns are active hackathons, cells show the role and an "accountable" marker. Empty columns (nobody accountable) are flagged.
- **Member history:** each member's past hackathons, roles and results. Feeds the member filter on the portfolio (phase 07).

## Implementation

### Task 6.1: Members screen
**Files:** `apps/web/app/(app)/team/*`.
- [x] **Commit:** `feat(web): members screen`

### Task 6.2: Workload
**Files:** `packages/shared/src/workload.ts`, `apps/api` route `GET /team/workload`.
- [x] `workload(members, hackathons, tasks)` and `overlaps(a, b)`.
- [x] **Check:** tests for the overlap rule and the counts.
- [x] **Commit:** `feat: team workload`

### Task 6.3: Responsibility grid
- [x] **Commit:** `feat(web): responsibility grid`

### Task 6.4: Member history
- [x] **Commit:** `feat(web): member history`

## As built

- **Routes:** `/team` (members with workload, then the responsibility grid), `/team/new`, and `/team/[id]` (edit form, remove, history). The add, edit and remove actions are `saveMember` and `removeMember` in `apps/web/lib/actions.ts`. A new member opens on their own page, and removing one returns to `/team`. Remove asks twice inline, not in a modal.
- **API:** `GET /members/:id` returns the member plus `history`. `GET /team/workload` returns the active hackathons, soonest first, and one `WorkloadRow` per member. Members CRUD was already there from phase 02.
- **Workload rules** (`packages/shared/src/workload.ts`, with tests): active means Registered or Building. Open tasks are tasks that aren't done, assigned to the member, on active hackathons. `overlaps()` treats a hackathon as start to end; the end falls back to the submission deadline, a lone date counts as a single moment, touching ends overlap, and undated events never clash.
- **Overlap warning:** shown in two places. On `/team`, a member row lists any clash between their active hackathons. On the workspace Team & roles tab, a ticked member is warned when this hackathon's dates overlap one of their other active hackathons. The second is the warning that applies before you assign someone.
- **Workload bar:** open tasks relative to the busiest member, plus the active count. No chart library.
- **Responsibility grid:** a plain table. It scrolls sideways inside its own box on phones; the box is `relative` so the cells' sr-only text can't widen the page. "A" marks the accountable person. A column with nobody accountable is flagged, which happens when a hackathon has no team or its accountable member was removed.
- **History:** the member's Submitted and Results hackathons, newest first, with role and result. The result square is W, F or P, or a dashed square while awaiting the result. Phase 07's member filter can read assignments the same way.
- **Shared:** the role labels moved to `ROLE_LABEL` in `apps/web/lib/format.ts`, used by the workspace Team tab too.
