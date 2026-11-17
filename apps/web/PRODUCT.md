# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A small Malaysia-based hackathon team, a mix of university students and early-career working developers. They use HackOps to decide which hackathons to enter, split the work, hit deadlines and keep a record of what they built. They work **laptop first**: the board, workspaces and planning happen on a laptop; the phone is mainly for checking what's due.

Secondary audience: people outside the team (recruiters, judges, other teams) who open the public portfolio page from a CV or LinkedIn link.

## Product Purpose

The team wants to enter more hackathons to gain experience, build a portfolio and have a fair shot at winning. HackOps keeps the pipeline full (automatic discovery in Malaysia and overseas), makes each entry cheap to run (pre-filled workspace, roles, tasks, deadlines, sign-up assist) and turns every submission into a public portfolio entry. Success: more entries per season, no missed deadlines, a portfolio page worth linking, and a rising win rate.

## Positioning

A project-management tool built only for hackathons: each event is a small project that moves through a light lifecycle (Initiation → Planning → Execution → Monitoring → Closing) on its own as the stage changes, connected to discovery, fit scoring, past-winner analysis and a portfolio. Generic tools (Trello, Linear, Notion) don't find events, know their deadlines or produce a portfolio; hackathon platforms (Devpost, Devfolio) don't run the team's work.

## Operating Context

- Hackathons last 24 to 72 hours; registration and submission deadlines are the pressure points. Every time is shown in Malaysia time (Asia/Kuala_Lumpur).
- Sources: Devpost, MLH, a curated Malaysian list, manual entries.
- Registration happens on the organiser's site; HackOps fills forms through a bookmarklet and a human always clicks submit.
- Reminders reach phones through a subscribed calendar feed.
- Demo: one shared team, no logins, runs locally.

## Capabilities and Constraints

- Screens: Discover, Board (pipeline across hackathons), Hackathon workspace (Overview, Tasks, Team & roles, Timeline, Activity, Links & submission, Retro), Team, Projects, public Portfolio, Settings (team profile, bookmarklet).
- Stages: discovered, interested, registered, building, submitted, results, skipped.
- Roles on a hackathon: lead, developer, designer, pitch; exactly one accountable person.
- Stack: Next.js 16, React 19, Tailwind CSS 4 in `apps/web`; NestJS API in `apps/api`.
- **No React icon library.** Icons and the logo are SVG files from an outside source in `public/`.
- Full product spec: `../../docs/spec.md`.

## Brand Commitments

- Name: **HackOps**. Build the identity around it.
- Must not look AI-generated: no purple-gradient heroes, no glass cards inside cards, no emoji as icons, no untouched default component-library look.

## Evidence on Hand

None yet: no real hackathon history, results, team photos or testimonials. The demo uses clearly fictional seed data; the portfolio must never present seed entries as real wins.

## Product Principles

1. **Time is the main character.** The next deadline and its urgency are always the first thing you can read.
2. **Never slow the team down.** The lifecycle runs underneath; no screen demands paperwork to move forward.
3. **Every entry leaves something behind.** Each workspace ends in a portfolio-ready record.
4. **A human presses submit.** Automation fills and reminds; it never acts in the team's name.

## Accessibility & Inclusion

WCAG 2.2 AA: contrast, visible keyboard focus, full keyboard operation of the board and task moves (not drag-only), reduced-motion support.
