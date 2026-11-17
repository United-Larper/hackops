# 08: Deadlines and reminders

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md).

## Design

**Goal:** nobody misses a registration close or a submission deadline.

- **Due-soon panel:** in the app shell (the slot from phase 01). Lists every deadline in the next 7 days across active hackathons and tasks, grouped Today, Tomorrow, This week, in urgency colours.
- **Calendar feed:** `GET /calendar.ics` returns every event deadline and task due date as calendar events with alarms at 7 days, 2 days and on the day. Subscribing in Google Calendar or Outlook gives phone notifications with no email or chat service. Written by hand (the format is small), no calendar library.
- **Times:** stored in UTC; the feed uses UTC times so calendar apps convert correctly; the app shows Malaysia time.

**Limit:** calendar apps refresh subscribed feeds on their own schedule (Google: several hours). Fine for deadlines days away; chat reminders in phase 11 cover same-day nudges.

## Implementation

### Task 8.1: Due-soon
**Files:** `packages/shared/src/deadlines.ts`, `apps/api` route `GET /deadlines?days=7`, `apps/web/components/shell/due-soon.tsx`.
- [ ] `upcomingDeadlines(hackathons, tasks, now, days)`.
- [ ] **Check:** tests for grouping and for skipping closed or finished items.
- [ ] **Commit:** `feat: due-soon panel`

### Task 8.2: Calendar feed
**Files:** `apps/api/src/calendar.controller.ts`, `packages/shared/src/ics.ts`.
- [ ] **Check:** a test that the output has CRLF line endings, folded long lines and escaped commas, and that it imports into Google Calendar by hand.
- [ ] **Commit:** `feat(api): calendar feed`
