# 11: Later (don't start yet)

These were discussed and deliberately left out of the demo. Each needs its own design pass before building.

## 11.1 AI hook
One optional module that switches on when an API key is set; the app works the same without it.
- **Idea generator:** event themes + sponsor APIs + team skills + past projects → ideas that reuse existing code.
- **Smarter prize-track parsing** for messy prize text.
- **Written "what wins here"** brief on top of the phase 10 counts.
- **Fit score re-ranking** from event descriptions.

## 11.2 Accounts, chat reminders, hosting
- **Accounts:** sign-in per member; then "my tasks" and per-member reminders make sense.
- **Chat reminders:** Telegram or Discord bot posting the due-soon list each morning and same-day nudges.
- **Overlap planner:** a calendar across all events with conflict warnings beyond the phase 06 overlap check.
- **Hosting:** Vercel for web and API, Postgres from the Vercel Marketplace instead of SQLite (a Prisma adapter swap), discovery on a Vercel cron.
- **More sources:** Devfolio, Luma, Eventbrite, Taikai.
