# 09: Sign-up assist

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md).

## Design

**Goal:** registering the team takes a click and a review, not ten minutes of retyping.

**Why not a bot that signs up by itself:** every platform registers differently (Devpost, Devfolio, Luma, Google Forms, Typeform, custom sites), many need each person's own login and email check, and some use CAPTCHAs. A bot would break constantly and could break the platforms' terms. Spec §2 rules it out.

**How it works:**
1. **Team profile** (`/settings`): team name and pitch, plus each member's sign-up fields (phase 06).
2. **Bookmarklet:** the settings page shows a "HackOps fill" button to drag to the bookmarks bar. On any registration page, clicking it:
   - asks which member is filling the form (or the team),
   - loads that profile from the local API,
   - fills the fields it can match by `name`, `id`, `autocomplete`, label text or placeholder (email, name, university, GitHub, LinkedIn, T-shirt, dietary, team name, pitch),
   - outlines every filled field so the person can review it,
   - **never submits.**
3. After the person submits on the site, they mark the hackathon Registered in HackOps.

**Security:** the bookmarklet only reads from `localhost` and only the profile endpoint, which returns sign-up fields and nothing else, and only with the secret token the bookmarklet carries (see As built). CORS on that one route is open to any origin because the bookmarklet runs on third-party pages; nothing else gets that header. No passwords are stored or filled.

**Limit:** pages inside cross-origin iframes (some embedded Google Forms) can't be reached by a bookmarklet. Open the form directly instead.

## Implementation

### Task 9.1: Team profile
**Files:** `apps/web/app/(app)/settings/*` (one Settings page, not `settings/profile` and `settings/bookmarklet`), `apps/api` routes `POST /team/fill-token` and `GET /signup-profile?token=…` (one route returning the team and every member, since the picker needs the list).
- [x] **Commit:** `feat: team sign-up profile and bookmarklet` (one commit for 9.1 and 9.2: the API controller and Settings page carry both)

### Task 9.2: Bookmarklet
**Files:** `packages/shared/src/field-match.ts`, `apps/web/app/fill.js/route.ts` (a route, not `public/fill.js`, so it can ship the shared matcher), `apps/web/app/(app)/settings/bookmarklet.tsx`.
- [x] The bookmarklet is a one-line loader that injects `fill.js` from the local web app, so it can be changed without re-installing.
- [x] `matchField(fieldHints) → profileKey | null` in shared.
- [x] **Check:** tests for field matching on samples from Devpost, Devfolio, Luma and a Google Form.
- [x] **Check:** manual run on a real registration page, stopping before submit (done by a teammate on 2026-11-26 after allowing Chrome's local network access prompt).
- [x] **Commit:** see 9.1.

## As built

- **Security changed from the plan (user-approved).** Member ids are public (`GET /portfolio` and the CV link use them), so an open-CORS `GET /signup-profile/:memberId` would have let any website a teammate visits read everyone's email, organisation, T-shirt and dietary needs from localhost. The team row now has a `fillToken` (migration `fill_token`), made and rotated with `POST /team/fill-token` (24 random bytes, base64url). `GET /signup-profile?token=…` compares it in constant time, returns only sign-up fields, and answers 404 for a wrong, missing or retired token. It is still the only route with `Access-Control-Allow-Origin: *`, set before any throw so fill.js can show the 404 message.
- **Settings** is one page: the team profile form (every `TeamInput` field, since `PUT /team` replaces the row), a sign-up readiness list linking to each member's existing form on `/team/[id]`, and the bookmarklet. The bookmarklet appears once the team profile exists and a secret has been made.
- **fill.js** is served by a route handler that writes `(fill)((matchField), API_URL)` from the functions' source text, so `matchField` stays tested in shared and both functions must be self-contained. A shared test runs `matchField` from its source text. The panel lives in a shadow root and uses `textContent` only. It skips password, hidden, checkbox and other non-text inputs, disabled, read-only, invisible and already-filled fields, and any field whose `maxlength` is shorter than the value (a pitch is never cut short). Values go through the prototype's `value` setter plus `input` and `change` events, so React and Vue forms see them. Filled fields get an ink-and-gold ring. Nothing is ever submitted.
- **Trusted Types:** Google Forms enforces `require-trusted-types-for 'script'`, so the loader passes the script URL through a Trusted Types policy that allows that one URL only. `strict-dynamic` lets a script element inserted this way run.
- **The bookmark link:** React 19 blocks `javascript:` URLs in `href`, so the address is set on the element in an effect. A Copy button is the alternative to dragging (WCAG 2.2 dragging movements).
- **Verified:** on a fixture with Devpost-, Google-Form- and Luma-style markup served from the app, 7 fields were filled correctly and password, project name, an over-long pitch and a pre-typed email were left alone. On a real third-party page (docs.google.com) the script request stayed pending: Chrome's Local Network Access asks the person to allow a public site to reach localhost, and that prompt is for a person to answer. A teammate then ran it on a real registration page on 2026-11-26, allowed the prompt, and confirmed the filled fields without submitting.
- **Limits:** first name is the first word of the name and the rest is the last name; a select must have an option exactly equal to the value ("M", not "Medium"); fields inside cross-origin frames can't be reached; only tested in Chrome.
