---
version: 1
slug: "app-portfolio-page-tsx"
primary_target: "app/portfolio/page.tsx"
related_targets: ["app/portfolio/opengraph-image.tsx"]
---

## Scope

The public portfolio at `/portfolio`, outside the app shell, read-only. Mode: Experience. Filters: member (`?member=`, the link a member puts in a CV) and category.

## Audience and job

Primary: a recruiter arriving from one member's CV or LinkedIn link, who needs that person's projects, role on each team and the results in seconds. Secondary: judges and other teams on the unfiltered page. Projects lead; results support them. Seed (demo) entries are shown but always labelled as sample, never as real results.

## Direction contract

THESIS: The portfolio as a stack of team sheets. Every entry is the project first, with that event's lineup beside it and the CV-linked member lit gold. It refuses the category default: a grid of project thumbnails with a skills sidebar.

OWN-WORLD: Matchday. Touchline-white ground, white project panels with hairlines, an ink team-sheet column per entry with condensed uppercase role names, gold only on ink (the wordmark's HACK, the TEAM SHEET label, the linked member). W/F/P result squares from the form guide; wins and finalists also named in condensed caps. Sample entries carry a dashed tag. No shadows.

STORY: The recruiter sees the member's name, what they built, the role they held on each team and how it went, and opens repo, demo or video in one click. Then they can widen to the whole team or a teammate.

FIRST VIEWPORT: Ink top bar: wordmark, team name, member switcher (active member gold). Below, the member's name at 64px condensed with roles and entry count, sample note at right, category chips. Then project panels: result square, event and date meta; project name 52px condensed; one-line description; tech chips; links. A 380px ink team sheet sits at the right of each panel; on phones it drops below the project.

FORM: Team sheet (matchday lineup graphic), position 4 of the ordered list. seed:4ea6347fd0f5a929

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
