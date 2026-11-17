# 01: Design system and app shell

> For whoever implements this (you or Claude): work task by task and tick each one off in [../README.md](../README.md). Claude uses the **impeccable** and **ui-ux-pro-max** skills for every task in this phase, without subagents.

## Design

**Goal:** settle how HackOps looks and feels before any feature screen exists, so every later phase builds on the same system instead of inventing one per page.

**Who it's for:** a small student or early-career team that uses the app daily during busy hackathon seasons, often on a laptop late at night and on a phone between classes.

**What it must feel like:**
- **A tool for people who ship.** Dense where it helps (the board, the grids), calm everywhere else. Closer to Linear or Height than to a marketing site.
- **Time is the main character.** Deadlines, countdowns and stage are the most prominent things on every screen. Everything is shown in Malaysia time.
- **Its own identity.** It must not look AI-made (see the UI rules in the README).

**References to study (task 1.1):** look at each live site, note what to take and what to avoid, and write the result into the direction section below.
- Project management: Linear, Height, Plane, Huly, Attio (density, keyboard feel, list and board patterns)
- Hackathon platforms: Devpost, Devfolio, ETHGlobal, MLH (how events, prizes and deadlines are presented)
- Portfolio pages: read.cv, Bento, Cosmos (for the public portfolio in phase 07)

**Decisions already made:**
- Icons and the logo are **outside SVG files**, not a React icon package. Candidates: an Iconify set downloaded as SVG (Phosphor, Tabler or Solar), or a set from svgrepo with a licence that allows reuse. The logo is either designed as an SVG here or adapted from an openly licensed mark. The licence goes in `apps/web/public/icons/LICENSE.md`.
- Light and dark themes, both first-class.
- Tailwind CSS 4 with design tokens as CSS variables in `apps/web/app/globals.css`.
- Fonts come from `next/font` (self-hosted at build time).

**Direction: Matchday** (chosen 2026-11-17 from five options; the full contract is in `apps/web/.impeccable/surfaces/`):
- **Style family:** a hackathon season run like a football season. Deadlines are fixtures with kick-off times in Malaysia time, the event being built shows a live match clock, results build a form guide (W won, F finalist, P participated).
- **Colour palette and roles:** ink-black rail `#0E0E0C` and tiger gold `#F4C21B` (Harimau Malaya) carry the shell. Neutral off-white work ground, white panels. **Signal red `#FF4D2E` is reserved for the live clock and anything due within 24 hours.** Results: won green, finalist gold, participated graphite.
- **Type pairing and scale:** Barlow Condensed (headings, numerals, clocks, tabular figures) with Barlow (UI text). No monospace.
- **Radius, borders, elevation:** 6 to 10px radius, 1px hairline borders, no drop shadows; depth comes from the ink panels against the light ground.
- **Motion:** one authored move, the match clock ticking. Everything else is instant or a short fade; reduced motion respected.
- **Taken from references:** Devpost's prominent deadline and prize; ETHGlobal's date as a typographic tile; MLH's grouping and filter chips; Linear's density and keyboard-first lists.
- **Avoiding:** sports-fan costume (no pitches, badges, crests or grass textures), purple gradients, glass, emoji icons, a grey tool with one accent.
- **Icons and logo:** Phosphor icons (MIT), downloaded as SVG into `public/icons`; the logo mark is Phosphor's timer glyph on a gold tile next to the HACKOPS wordmark.

## Implementation

### Task 1.1: Reference study and direction
**Files:** this file (direction section).
- [x] Run the ui-ux-pro-max design-system search for "hackathon project management dashboard, productivity, developer tool".
- [x] Open each reference site, take screenshots, and note patterns to take or avoid.
- [x] Use impeccable's shape step to write the direction above. Show the user two or three options as quick mockups before settling.
- [x] **Check:** the user approves the direction.
- [x] **Commit:** `docs: visual direction for HackOps`

### Task 1.2: Tokens, type and colour
**Files:** `apps/web/app/globals.css`, `apps/web/app/layout.tsx`.
**Interfaces:** produces the CSS variables every later screen uses (surface, text, border, accent, stage colours, deadline urgency colours).
- [x] Write the tokens for light and dark, plus the stage and urgency colours (on time, due soon, overdue).
- [x] Load the fonts through `next/font`.
- [x] **Check:** a `/styleguide` page shows every token, type size and stage colour in both themes. Contrast passes WCAG AA.
- [x] **Commit:** `feat(web): design tokens and type`

### Task 1.3: Logo and icons
**Files:** `apps/web/public/logo.svg`, `apps/web/public/icons/*.svg`, `apps/web/public/icons/LICENSE.md`, `apps/web/components/icon.tsx`.
**Interfaces:** produces `<Icon name="…" />`, a tiny component that renders an SVG from `public/icons` through CSS `mask-image`, so icons take the text colour.
- [x] Pick the icon set, download only the icons the shell and the board need, record the licence.
- [x] Make the logo and the favicon.
- [x] **Check:** the icons show on the styleguide page in both themes, and there is no icon package in `package.json`.
- [x] **Commit:** `feat(web): logo and icon set`

### Task 1.4: App shell
**Files:** `apps/web/app/(app)/layout.tsx`, `apps/web/components/shell/*`.
**Interfaces:** produces the sidebar (Discover, Board, Team, Projects, Portfolio, Settings), the page header, the empty-state component and the due-soon slot that phase 08 fills.
- [x] Build the shell, mobile layout included (sidebar becomes a bottom bar or a drawer).
- [x] Run impeccable's critique and audit steps on it and fix what they find.
- [x] **Check:** every nav item opens an empty, designed page; works at 375 px wide; keyboard focus is visible.
- [x] **Commit:** `feat(web): app shell and navigation`
