# 05: Hackathon workspace

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md).

## Design

**Goal:** every hackathon gets its own workspace where the team sees what's happening and who's on what.

**Route:** `/h/[id]`, with tabs as nested routes so each tab has its own URL.

| Tab | Shows | Lifecycle phase |
|---|---|---|
| **Overview** | stage and phase, next deadline countdown, progress, owner, categories, linked project, decision note, event link, prize, mode and place | all |
| **Tasks** | a small board (To do, Doing, Done) with assignee and due date; starts from the template (phase 02) | Planning, Execution |
| **Team & roles** | who's in, their role, the one accountable person; skill gaps against the event's categories | Planning |
| **Timeline** | event dates and task due dates on one line, in Malaysia time, with "now" marked | Planning, Monitoring |
| **Activity** | the change feed and notes, newest first; a box to add a note (decision, blocker, idea) | Execution |
| **Links & submission** | the linked project's repo, demo, video, slides; the pre-submission check from phase 10 | Monitoring, Closing |
| **Retro** | result, what went well, what to change; appears from Submitted on | Closing |

**Keeping it light (anti-goal in spec §2):** the workspace is fully pre-filled the moment a hackathon is registered. Nothing blocks a stage change except Results needing a result.

**Header across all tabs:** title, stage control, countdown, owner, a lifecycle strip showing the five phases with the current one highlighted.

## Implementation

### Task 5.1: Layout and overview
**Files:** `apps/web/app/(app)/h/[id]/layout.tsx`, `page.tsx`, `components/workspace/*`.
- [ ] Header, lifecycle strip, tab bar, overview cards. Built with impeccable and ui-ux-pro-max.
- [ ] **Commit:** `feat(web): workspace layout and overview`

### Task 5.2: Tasks
- [ ] Task board with add, edit, assign, due date (native `<input type="date">`), drag between statuses, keyboard menu.
- [ ] **Commit:** `feat(web): workspace tasks`

### Task 5.3: Team and roles
- [ ] Pick members and roles; exactly one accountable (enforced by the API with a test); skill-gap hint from `@hackops/shared`.
- [ ] **Commit:** `feat: workspace team and roles`

### Task 5.4: Timeline
- [ ] Plain HTML and CSS timeline (no chart library).
- [ ] **Commit:** `feat(web): workspace timeline`

### Task 5.5: Activity and notes
- [ ] **Commit:** `feat(web): workspace activity`

### Task 5.6: Links and submission
- [ ] Link an existing project or create one in place; slot for the phase 10 check.
- [ ] **Commit:** `feat(web): workspace links`

### Task 5.7: Retro
- [ ] **Commit:** `feat(web): workspace retro`

**Check for the phase:** register a seeded hackathon, assign the team, move two tasks to done, add a note, link a project, submit, record a result and a retro. Every tab reflects each step; works at 375 px.
