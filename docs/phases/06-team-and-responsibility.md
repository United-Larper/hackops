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
- [ ] **Commit:** `feat(web): members screen`

### Task 6.2: Workload
**Files:** `packages/shared/src/workload.ts`, `apps/api` route `GET /team/workload`.
- [ ] `workload(members, hackathons, tasks)` and `overlaps(a, b)`.
- [ ] **Check:** tests for the overlap rule and the counts.
- [ ] **Commit:** `feat: team workload`

### Task 6.3: Responsibility grid
- [ ] **Commit:** `feat(web): responsibility grid`

### Task 6.4: Member history
- [ ] **Commit:** `feat(web): member history`
