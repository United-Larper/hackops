# 07: Projects and portfolio

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md).

## Design

**Goal:** keep the team's projects and their links in one place, link them to hackathons, and show the results publicly.

**Projects:** name, description, tech, repo, demo, video, slides, Devpost link. One project can be linked to many hackathons (re-entered or reused); the project page lists them with their results.

**Portfolio page:** `/portfolio`, public (outside the app shell, no editing). It lists hackathons at Submitted or Results with event, project, tech, team members and result, newest first. Filters: category and member (`/portfolio?member=…` is the link a member puts in their CV). Wins and finalist results are highlighted. Nothing appears before Submitted.

**Design:** this page is what outsiders see, so it gets its own treatment within the phase 01 system, informed by the portfolio references (read.cv, Bento, Cosmos). Open Graph image and metadata so links preview well.

## Implementation

### Task 7.1: Projects screen and linking
**Files:** `apps/web/app/(app)/projects/*`.
- [ ] **Commit:** `feat(web): projects`

### Task 7.2: Portfolio page
**Files:** `apps/web/app/portfolio/*`, `apps/api` route `GET /portfolio`.
- [ ] The API returns only Submitted and Results entries, and only public fields (no emails, no sign-up profile fields).
- [ ] **Check:** a test that private member fields never appear in `/portfolio`; the page renders without the app shell; link previews show the OG image.
- [ ] **Commit:** `feat: public portfolio`
