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
- [x] Header, lifecycle strip, tab bar, overview cards. Built with impeccable and ui-ux-pro-max.
- [x] **Commit:** `feat(web): workspace layout and overview`

### Task 5.2: Tasks
- [x] Task board with add, edit, assign, due date (native `<input type="date">`), drag between statuses, keyboard menu.
- [x] **Commit:** `feat(web): workspace tasks`

### Task 5.3: Team and roles
- [x] Pick members and roles; exactly one accountable (enforced by the API with a test); skill-gap hint from `@hackops/shared`.
- [x] **Commit:** `feat: workspace team and roles`

### Task 5.4: Timeline
- [x] Plain HTML and CSS timeline (no chart library).
- [x] **Commit:** `feat(web): workspace timeline`

### Task 5.5: Activity and notes
- [x] **Commit:** `feat(web): workspace activity`

### Task 5.6: Links and submission
- [x] Link an existing project or create one in place; slot for the phase 10 check.
- [x] **Commit:** `feat(web): workspace links`

### Task 5.7: Retro
- [x] **Commit:** `feat(web): workspace retro`

**Check for the phase:** register a seeded hackathon, assign the team, move two tasks to done, add a note, link a project, submit, record a result and a retro. Every tab reflects each step; works at 375 px.

## As built

- **Route:** `/h/[id]` with tabs `/tasks`, `/team`, `/timeline`, `/activity`, `/links`, `/retro` (Retro only from Submitted on). Board cards link here; the phase 04 placeholder at `/board/[id]` is gone.
- **Data:** the layout and the open tab share one read per request (`getWorkspace` in `apps/web/lib/workspace.ts`, wrapped in React `cache`). Every mutation is a server action in `apps/web/lib/actions.ts`; writes refresh the page even when a later step fails, so a half-done save still shows what was stored.
- **Stage control:** the board's Move menu and its questions (Decide for Interested → Registered or Skipped, the W/F/P picker for Results) are shared components (`components/stage.tsx`, rules in `lib/stage.ts`), used by both the board and the workspace header.
- **Lifecycle strip:** five phases (Initiation, Planning, Execution, Monitoring, Closing); Building lights Execution and Monitoring together. On phones it names the current phase once under the bars.
- **Tasks:** native drag plus a Move menu per task; due dates use `<input type="date">` and are stored as 23:59 MYT that day; the edit dialog sends only changed fields, so an untouched due date keeps its exact time.
- **Team & roles:** saving the team also sets the hackathon's owner to the accountable person. Exactly one accountable is enforced by `TeamAssignmentsInput` (covered by an API test since phase 02). Gaps come from `skillGaps()` in `packages/shared/src/skills.ts`: missing roles plus a hand-written category → skills map, matched on whole words.
- **Activity:** a note has a kind (note, decision, blocker, idea) written as a prefix, and an optional author.
- **Links & submission:** edit the linked project's links, unlink, link an existing project or create one in place. The pre-submission check is a placeholder for phase 10.
- **Retro:** picking a result moves the hackathon to Results through the stage endpoint.
- **Fix found on the way:** Zod 4 keeps `.default()` inside `.partial()`, so every PATCH reset omitted defaulted fields (hackathon categories, prize tracks, project tech, member skills, task status). Patch schemas are now built by `patchOf()` in `schemas.ts`, with tests in shared and the API.

