---
name: HackOps
description: A hackathon season run like a football season. Fixtures, a live clock, and results that build a record.
colors:
  matchday-ink: "#0e0e0c"
  tiger-gold: "#f4c21b"
  signal-red: "#ff4d2e"
  signal-red-text: "#c22e13"
  result-green: "#157a43"
  graphite: "#3a3a35"
  touchline-white: "#f4f4f1"
  panel-white: "#ffffff"
  chalk-grey: "#ecece6"
  hairline: "#deded6"
  scoreboard-black: "#141412"
  bench-grey: "#5a5a53"
  rail-text: "#d4d4cc"
  rail-muted: "#8f8f87"
  rail-line: "#2c2c28"
  night-ground: "#121210"
  night-panel: "#1b1b18"
  night-text: "#edede6"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.1
  clock:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    letterSpacing: "0.05em"
rounded:
  chip: "3px"
  control: "6px"
  card: "8px"
  panel: "10px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.matchday-ink}"
    textColor: "{colors.tiger-gold}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.scoreboard-black}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  chip-filter:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.scoreboard-black}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  tag-category:
    backgroundColor: "{colors.chalk-grey}"
    textColor: "{colors.scoreboard-black}"
    rounded: "{rounded.chip}"
    padding: "2px 8px"
  nav-item-active:
    backgroundColor: "{colors.tiger-gold}"
    textColor: "{colors.matchday-ink}"
    rounded: "{rounded.control}"
    padding: "10px"
  fixtures-panel:
    backgroundColor: "{colors.matchday-ink}"
    textColor: "{colors.touchline-white}"
    rounded: "{rounded.panel}"
    padding: "12px 20px"
  input:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.scoreboard-black}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
---

# Design System: HackOps

## Overview

**Creative North Star: "Matchday"**

HackOps treats a hackathon season like a football season. Every deadline is a fixture with a kick-off time in Malaysia time; whatever the team is building runs a live match clock; every result goes into a form guide. The shell wears Harimau Malaya colours, an ink-black rail and tiger gold, so the identity lives in the frame while the work area stays a calm, neutral ground for dense lists and boards.

The system is built for an operating tool, not a fan site. The world lends four things only: condensed sports numerals, the ink-and-gold palette, matchday density, and one signature move (the match clock). Layout, navigation and controls are the standard ones a project tool needs. There are no pitches, crests, grass or stadium textures anywhere.

Density is closer to Linear than to a marketing page: 15px UI text, tight rows, hairline borders, and large condensed numerals wherever time matters. Light and dark are both first-class; the rail and fixtures panel stay ink in both.

**Key Characteristics:**
- Ink rail and gold active state carry the identity; the work area stays neutral.
- Time is set in condensed tabular numerals, always in MYT.
- Signal red belongs only to the live clock and anything due within 24 hours.
- Flat surfaces, hairline borders, no drop shadows.
- Icons are Phosphor bold SVG files, never a React icon package.

## Colors

A committed two-colour shell (ink and gold) over a neutral ground, with three state colours that each have exactly one job.

### Primary
- **Matchday Ink** (#0e0e0c): the rail, the fixtures panel, primary buttons, avatars. The frame every screen sits in.
- **Tiger Gold** (#f4c21b): the active nav pill, the HACK in the wordmark, section headings on ink, the text of primary buttons, finalist results, fit-score badges. Always paired with ink, never on the light ground as text.

### Secondary
- **Signal Red** (#ff4d2e on ink; Signal Red Text #c22e13 on light): the match clock and anything due within 24 hours.
- **Result Green** (#157a43, #1fa35b in dark mode): W in the form guide and "won" results.
- **Graphite** (#3a3a35): P in the form guide, "participated" results.

### Neutral
- **Touchline White** (#f4f4f1): the work-area ground in light mode, and the strong text colour on the rail.
- **Panel White** (#ffffff): cards, inputs, filter chips.
- **Chalk Grey** (#ecece6): category tags and quiet fills.
- **Hairline** (#deded6): every 1px border and divider on light surfaces.
- **Scoreboard Black** (#141412): body text and the 2px rule under board column headings.
- **Bench Grey** (#5a5a53): secondary text and metadata.
- **Rail Text / Rail Muted / Rail Line** (#d4d4cc / #8f8f87 / #2c2c28): text, labels and dividers on ink.
- **Night Ground / Night Panel / Night Text** (#121210 / #1b1b18 / #edede6): the dark-mode equivalents of ground, panel and text.

### Named Rules
**The Reserved Red Rule.** Signal red marks only the live match clock and deadlines due within 24 hours. If something is red, it is urgent; nothing decorative, no error styling, no brand use.

**The Frame Not Fill Rule.** Ink and gold live in the shell (rail, fixtures, primary action, active state). The work area stays neutral so the data reads first.

## Typography

**Display Font:** Barlow Condensed (with Barlow, system sans)
**Body Font:** Barlow (with system sans)

**Character:** a sports-broadcast condensed face for titles, numbers and clocks, paired with its regular-width sibling for everything people read at length. Tabular figures throughout, so countdowns and dates never jitter.

### Hierarchy
- **Display** (700, 40px; 34px on phones, line-height 1): page titles.
- **Headline** (700, 24px): empty-state titles and section headings in the work area.
- **Clock** (800, 30px, tabular): the match clock. Fixture times use 22px 700, dates 20px 700.
- **Label** (700, 17px, 0.05em tracking, uppercase): board column headings and the fixtures heading on ink.
- **Title** (600, 15px, line-height 1.25): card and row titles.
- **Body** (400, 15px, line-height 1.6, max 62ch): descriptions, notes, empty-state text.
- **Meta** (400 to 500, 12 to 13px): places, dates, counts, in Bench Grey.

### Named Rules
**The Condensed For Time Rule.** Any number a person scans to decide something (a time, a date, a countdown, a count, a score) is set in Barlow Condensed. Sentences are never condensed.

## Layout

A fixed 220px ink rail on the left from 768px up; on phones it becomes an ink top bar (wordmark, settings) and a five-item ink bottom bar (Discover, Board, Team, Projects, Portfolio), with safe-area padding. The work area runs fluid with 28px side padding (16px on phones) and a 20px vertical rhythm between header, fixtures and content. Every app page opens with the same sequence: title row (title, filters, primary action), the fixtures panel, then the page's content. The board is five equal columns with 14px gaps; below 1000px it scrolls sideways rather than squeezing.

## Elevation & Depth

Flat by design. There are no drop shadows. Depth comes from contrast between the ink shell and the light work area, and from 1px hairline borders on panels and cards. In dark mode, where ink and ground get close, the rail and the fixtures panel carry a 1px Rail Line border.

### Named Rules
**The No Shadow Rule.** Surfaces separate by colour and hairlines, never by box-shadow.

## Shapes

Gently squared corners: 3px on tags and form-guide squares, 6px on controls and nav items, 8px on cards, 10px on the ink panels, fully round on filter chips and avatars. Dashed hairline borders mean "nothing here yet" and appear only on empty states.

## Components

### Buttons
- **Shape:** gently squared (6px).
- **Primary:** Matchday Ink with Tiger Gold text, 600 weight, 10px 16px. One per page, top right of the title row.
- **Secondary:** Panel White with a hairline border and Scoreboard Black text.
- **Disabled:** 50% opacity, no hover.
- **Focus:** 2px outline in the text colour, 2px offset; gold on the rail.

### Chips
- **Filter chip:** Panel White, hairline border, fully round, 14px 500.
- **Category tag:** Chalk Grey fill, 3px radius, 12px 500.

### Cards / Containers
- **Corner Style:** 8px for cards, 10px for panels.
- **Background:** Panel White (Night Panel in dark).
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px Hairline.
- **Internal Padding:** 12px.

### Inputs / Fields
- **Style:** Panel White, 1px Hairline, 6px radius, 15px text, visible label above.
- **Focus:** the global focus outline.

### Navigation
- **Rail item:** Barlow 15px 500, Rail Text, 20px icon, 10px padding, 6px radius. Hover: Rail 2 fill and strong text. Active: solid Tiger Gold pill with ink text, 600 weight, `aria-current="page"`.
- **Mobile bottom bar:** five items, icon over an 11px label, 56px tall targets, active item in gold.

### Fixtures panel (signature)
The due-soon slot on every app page: an ink panel headed "This week's fixtures" in gold condensed caps. Each row: day and date tile (TODAY or month underneath), kick-off time in MYT, event, what's due, countdown. Rows due within 24 hours turn their time and countdown Signal Red. On phones only the next fixture shows.

### Match clock (signature)
HH:MM:SS in 30px condensed 800, ticking once a second, with an uppercase label ("Live · to submission"). Signal Red on ink, Signal Red Text on light. Reads "Full time" once the deadline passes.

### Form guide (signature)
A row of 22px squares, oldest first: W in Result Green, F in Tiger Gold, P in Graphite, letters in condensed 700. Announced to screen readers as words ("won, participated, finalist").

## Do's and Don'ts

### Do:
- **Do** set every time in Malaysia time and in condensed tabular numerals.
- **Do** keep ink and gold in the shell and the work area neutral.
- **Do** use Phosphor bold SVGs from `public/icons` through the `Icon` component.
- **Do** give every empty page a dashed empty state saying what will appear and where it comes from.
- **Do** keep keyboard paths for anything draggable (board cards, tasks).

### Don't:
- **Don't** use Signal Red for anything except the live clock and deadlines due within 24 hours.
- **Don't** add drop shadows, gradients, glass or blur.
- **Don't** add football costume: pitches, grass, crests, jerseys, stadium photos.
- **Don't** install a React icon library or use emoji or Unicode glyphs as icons.
- **Don't** put a small label or eyebrow above a heading; the heading speaks for itself.
- **Don't** put gold text on the light ground; gold only sits on ink or behind ink text.
