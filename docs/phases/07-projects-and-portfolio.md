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
- [x] **Commit:** `feat(web): projects`

### Task 7.2: Portfolio page
**Files:** `apps/web/app/portfolio/*`, `apps/api` route `GET /portfolio`.
- [x] The API returns only Submitted and Results entries, and only public fields (no emails, no sign-up profile fields).
- [x] **Check:** a test that private member fields never appear in `/portfolio`; the page renders without the app shell; link previews show the OG image.
- [x] **Commit:** `feat: public portfolio`

## As built

- **Projects:** `/projects` lists each project with its tech, how many hackathons it was entered in, and which links are missing. `/projects/new` and `/projects/[id]` add, edit and remove projects; removing one keeps the hackathons' results but drops the link. The project page's **Entered in** panel lists its hackathons with W/F/P results, unlinks any of them, and links it to another board hackathon. Linking a hackathon that already has a project replaces it, and the picker says so.
- **API:** `GET /projects` adds `entries` (a count); `GET /projects/:id` adds `hackathons`, newest first. The workspace Links tab now counts shared links from that, instead of fetching every hackathon.
- **Shared pieces:** `PROJECT_LINKS` (the five link fields) in `lib/format.ts`, and `ResultSquare` in `components/result.tsx`, used by member history, project entries and the portfolio. The newest-first sort key is `newest()` in `apps/api/src/mappers.ts`.
- **Portfolio API:** `GET /portfolio?category=&member=` (`apps/api/src/portfolio.controller.ts`). It returns Submitted and Results entries only, newest first, with every field picked by hand. Members come back as id, name and role only, with no email, links or sign-up fields. Decision notes, retro text and the result note never leave; the result note is excluded because its placeholder invites judges' feedback. Filter options come from all entries, so one filter never hides the other's choices. Two API tests cover the stage, order and filters, and check that no private field or note appears anywhere in the response.
- **Sample data:** each entry carries `sample` (source `demo`). The page tags every sample entry and says "Demo data, not real results". The OG card's tally counts real entries only and reads "Sample entries only" when that's all there is.
- **Portfolio page:** `/portfolio` sits outside the app shell. Design: impeccable new-work at surface scope inside the Matchday world. The user answered that the reader is a recruiter from a CV link, that projects lead, and that demo entries show labelled; the roll dealt three structures and the user locked **Team sheet**. The direction contract is in `apps/web/.impeccable/surfaces/app-portfolio-page-tsx.md`. Each entry is a project panel with an ink team sheet beside it, and `?member=` lights that member gold. Teammates' names link to their own filtered view.
- **Metadata:** per-member title and description; `opengraph-image.tsx` renders a 1200×630 ink card. `metadataBase` comes from `SITE_URL` (defaults to localhost). The card fetches Barlow Condensed from Google Fonts when it renders and falls back to the default face offline; this is marked `ponytail:`.
- **Open:** the portfolio's display sizes (64/44px name, 52/36px project name) sit above DESIGN.md's type ramp on purpose. Recording them in DESIGN.md needs the user's go-ahead.
