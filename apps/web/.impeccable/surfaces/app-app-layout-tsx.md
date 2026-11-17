---
version: 1
slug: "app-app-layout-tsx"
primary_target: "app/(app)/layout.tsx"
related_targets: ["app/styleguide/page.tsx"]
---

## Scope

The HackOps app shell and its design system: navigation, page header, fixtures strip (due-soon slot), empty states, and the tokens every later screen uses. Mode: Operate.

## Audience and job

A Malaysia-based mixed student/working-developer hackathon team, laptop first, deciding what to enter, splitting work, and hitting deadlines (see PRODUCT.md).

## Direction contract

THESIS: A hackathon season run like a football season. Deadlines are fixtures with kick-off times in MYT, the event being built carries a live match clock, and results build a W/F/P form guide. It refuses the category default: a grey neutral tool with one accent colour and deadlines buried in card metadata.

OWN-WORLD: Harimau Malaya matchday. Ink-black rail (#0E0E0C) and tiger gold (#F4C21B) as the shell's committed colours, a neutral off-white work ground, white panels with hairline borders. Barlow Condensed for numerals, headings and clocks (tabular figures); Barlow for UI text. Signal red (#FF4D2E) is reserved for the live clock and anything due within 24 hours, and nothing else (changed from "due today" after review: a deadline 3 hours away just past midnight went unflagged). Results: W green, F gold, P graphite squares.

STORY: The visitor sees what's due and when before anything else, sees which event is live and how long is left, then works the board. Over a season, the form guide shows the team getting better.

FIRST VIEWPORT: Left: 220px ink rail with gold HACKOPS wordmark, six nav items (active item a solid gold pill), team form guide pinned to the rail's foot. Top of the work area: page title in Barlow Condensed 40px, filter chips, primary action at the right in ink-on-gold. Below: the ink "This week's fixtures" strip, one row per deadline: day tile, kick-off time, event, what's due, countdown; rows due within 24 hours in signal red. Below that, the page's own content. On phones the rail becomes a five-item bottom bar and the fixtures strip collapses to its next fixture.

FORM: Matchday (football fixtures, live scorebug, form guide), position 3 of the ordered grounded list. Seed key 55c06144. Raise from Orienteering Map: one colour reserved for the active leg, so signal red belongs only to live and due-today.

SIGNATURE MOVE: the match clock. A live HH:MM:SS countdown in condensed numerals on whatever is in Building, ticking once a second, labelled "LIVE · TO SUBMISSION".

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
