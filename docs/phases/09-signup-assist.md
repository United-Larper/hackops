# 09: Sign-up assist

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md).

## Design

**Goal:** registering the team takes a click and a review, not ten minutes of retyping.

**Why not a bot that signs up by itself:** every platform registers differently (Devpost, Devfolio, Luma, Google Forms, Typeform, custom sites), many need each person's own login and email check, and some use CAPTCHAs. A bot would break constantly and could break the platforms' terms. Spec §2 rules it out.

**How it works:**
1. **Team profile** (`/settings/profile`): team name and pitch, plus each member's sign-up fields (phase 06).
2. **Bookmarklet:** the settings page shows a "HackOps fill" button to drag to the bookmarks bar. On any registration page, clicking it:
   - asks which member is filling the form (or the team),
   - loads that profile from the local API,
   - fills the fields it can match by `name`, `id`, `autocomplete`, label text or placeholder (email, name, university, GitHub, LinkedIn, T-shirt, dietary, team name, pitch),
   - outlines every filled field so the person can review it,
   - **never submits.**
3. After the person submits on the site, they mark the hackathon Registered in HackOps.

**Security:** the bookmarklet only reads from `localhost` and only the profile endpoint, which returns sign-up fields and nothing else. CORS on that one route is open to any origin because the bookmarklet runs on third-party pages; nothing else gets that header. No passwords are stored or filled.

**Limit:** pages inside cross-origin iframes (some embedded Google Forms) can't be reached by a bookmarklet. Open the form directly instead.

## Implementation

### Task 9.1: Team profile
**Files:** `apps/web/app/(app)/settings/profile/*`, `apps/api` route `GET /signup-profile/:memberId`.
- [ ] **Commit:** `feat: team sign-up profile`

### Task 9.2: Bookmarklet
**Files:** `packages/shared/src/field-match.ts`, `apps/web/public/fill.js`, `apps/web/app/(app)/settings/bookmarklet/*`.
- [ ] The bookmarklet is a one-line loader that injects `fill.js` from the local web app, so it can be changed without re-installing.
- [ ] `matchField(fieldHints) → profileKey | null` in shared.
- [ ] **Check:** tests for field matching on samples from Devpost, Devfolio, Luma and a Google Form; manual run on a real registration page, stopping before submit.
- [ ] **Commit:** `feat: sign-up bookmarklet`
