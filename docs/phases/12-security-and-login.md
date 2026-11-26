# 12: Security and per-member sign-in

> Issue [#11](https://github.com/United-Larper/hackops/issues/11). Added after phase 10; pulls "Accounts" forward from phase 11.

## Design

**Why:** the API had no sign-in and listened on every network interface.
- Anyone on the same Wi-Fi could read members' emails, dietary needs and the bookmarklet secret.
- Anyone on the same Wi-Fi could call every write route.
- Any website could send it form posts, for example moving a hackathon off the portfolio.
- The bookmarklet secret returned every member's sign-up details to whatever page it ran on.
- The pre-submission check would fetch any typed link, including addresses inside the local network.

**What:** each member signs in with their own email and password. The API alone decides who is signed in.
- `/login` sends the email and password to `POST /auth/login`.
- The API checks an scrypt hash and stores a session, keeping only the SHA-256 of its token.
- The web app keeps the token in an httpOnly cookie and sends it as a bearer header from `lib/api.ts`, which every API call already goes through.
- An API middleware answers 401 to anything without a valid session, except a short public list.
- Cross-site forms can't set that header, which also closes the form-post hole.
- No roles: every signed-in member can do everything, as before. The portfolio stays public.

**Kept small on purpose:**
- No auth library: `node:crypto` scrypt, random tokens and a Prisma table.
- No email: `set-password` prints a temporary password for the first sign-in or a forgotten one.
- The sign-in rate limit is in memory.

## Implementation

### 12.1 Data
- [x] Migration `accounts`:
  - `Member.email` becomes unique; existing emails are lowercased first, and blanks become NULL.
  - New `MemberSecret` table (password hash, fill token).
  - New `Session` table (token hash, member, expiry).
  - `Team.fillToken` is dropped.
- [x] **Commit:** `feat(api): per-member login`

### 12.2 API sign-in
- [x] `apps/api/src/auth.ts`: password hashing, tokens, `AuthMiddleware` with the `PUBLIC` list, `fillTokenOwner()`, and `AsyncLocalStorage` holding the signed-in member.
- [x] `apps/api/src/auth.controller.ts`: `POST /auth/login`, `/auth/logout`, `GET /auth/me`, `POST /auth/password`, `POST /auth/fill-token`.
- [x] The API listens on `127.0.0.1`; the portfolio picks project fields by hand.
- [x] **Check:** `auth.test.ts`, plus every existing API test signed in through `test/auth.ts`.

### 12.3 First run and reset
- [x] `pnpm --filter api set-password <email>`; the seed sets demo passwords from `SEED_PASSWORD`.

### 12.4 Web sign-in
- [x] `/login`, `proxy.ts`, the session cookie, a 401 → `/login` redirect in `lib/api.ts`.
- [x] Sign out in the rail and on Settings; change password on your own member page.
- [x] Notes are posted as you; security headers.
- [x] **Commit:** `feat(web): sign in, sign out and change password`

### 12.5 Per-member bookmarklet and calendar
- [x] One secret per member. `/signup-profile?token=` returns only its owner's fields; `/calendar.ics?token=` needs it too.

### 12.6 Outbound fetches
- [x] The pre-submission check refuses private addresses and names timeouts and connection failures apart.
- [x] Scraper redirects stay on the source's site.
- [x] **Commit:** `fix(api): safer outbound fetches`

### 12.7 CI and docs
- [x] `.github/workflows/check.yml` runs `pnpm check` and the web build.
- [x] **Docs:** spec, README, AGENTS.md and phase 11.

## As built

- **Public API routes**, listed in `PUBLIC` in `apps/api/src/auth.ts`:
  - `GET /health`
  - `GET /portfolio`
  - `GET /signup-profile` (fill token)
  - `GET /calendar.ics` (fill token)
  - `POST /auth/login`

  Everything else needs `Authorization: Bearer <session token>`. Sessions last 14 days, and expired ones are removed when met or at the next sign-in. A password change signs out your other sessions; `set-password` signs out all of that member's sessions.
- **Sign-in:**
  - The answer is the same for a wrong password and an unknown email, and both cost one scrypt run.
  - Failed sign-ins are rows in `LoginFailure` (migration `login_failures`), so an API restart doesn't lift a lockout. Rows older than 15 minutes are deleted on each sign-in attempt.
  - 429 after 5 failures per email (guessing one password, from any address) or 30 per browser address (trying many emails) within 15 minutes. The right password waits too.
  - A successful sign-in clears that email's failures; `set-password` clears them as well, since the lockout message points people to it.
  - The address comes from the web sign-in action (`x-forwarded-for`, which Next fills from the socket) as `x-client-address`. It's trusted as sent (`ponytail:`): fine while both servers listen on 127.0.0.1, where every browser is 127.0.0.1 and the address limit is effectively a global one. A hosted API must take it from its proxy.
  - Passwords are 10–200 characters. Emails are lowercased by `MemberInput` and `LoginInput`.
- **Who did what:** `logActivity` reads the signed-in member from `AsyncLocalStorage`, so every change line and note records its author with no change at the call sites. The Activity tab shows the name on change lines, and the note form lost its "From" picker. Cron jobs and the seed write with no author.
- **Web:**
  - `proxy.ts` (Next 16's name for middleware) only checks that the cookie exists. It sends you to `/login?next=…` and skips `/login`, `/portfolio`, `/fill.js` and static files.
  - The real check is the API. `lib/api.ts` turns a 401 into `redirect("/login")`, except on `/auth/login` and `/auth/password`, where a 401 means a wrong password.
  - Every `catch` around `api()` starts with `unstable_rethrow(e)` so that redirect isn't swallowed.
  - The cookie is `httpOnly`, `sameSite=lax`, and `secure` when `SITE_URL` is https.
  - `next` must be a path inside the app (no `//host`).
- **Local only:** the API binds `127.0.0.1:4000` (`HOST` overrides) and the web scripts pass `-H 127.0.0.1`, so neither answers on the network by default.
- **Bookmarklet and calendar:**
  - Settings → New secret rotates your own token, which retires your old bookmarklet and calendar link together.
  - `fill.js` offers you, or team only.
  - The calendar link moved from the README to Settings.
- **Headers** (`next.config.ts`): `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `strict-origin-when-cross-origin`, a Permissions-Policy, and no `X-Powered-By`. There's no script CSP: Next's inline scripts would need nonces (`ponytail:`).
- **Outbound fetches:**
  - `pointsInward()` resolves the link's host and refuses loopback, 10/8, 172.16/12, 192.168/16, 169.254/16, 100.64/10, `::1`, `fc00::/7` and `fe80::/10`.
  - Node's `BlockList` checks IPv4-mapped IPv6 against the IPv4 rules itself, so no `::ffff:0:0/96` rule (it would block every IPv4).
  - DNS rebinding between the check and the fetch is a known gap (`ponytail:`).
  - Scraper `get()` throws if the final URL's last two host labels differ from the request's.
- **Verified:**
  - `pnpm check`: shared 48, api 55.
  - `pnpm audit --prod`: clean. `effect` is pinned to `^3.22.1` in `pnpm-workspace.yaml` (GHSA-7589-6fvf-x4pw, via Prisma's config loader); `>=3.22.1` pulled effect 4, which breaks Prisma.
  - `curl`:
    - signed-out `/members` gives 401; `/portfolio` gives 200 with no emails;
    - a form-encoded stage change gives 401; the 6th wrong sign-in gives 429;
    - the LAN address is refused.
  - In Chrome:
    - `/board` redirects to `/login?next=/board`, and signing in lands back on `/board`;
    - a note shows its author;
    - a bookmarklet token returns only its owner;
    - a password change works, and the old password stops working;
    - no password form on someone else's page;
    - sign out, then `/team` sends you to `/login` and `/portfolio` stays open.
- **Not checked:** the sign-in page at 375 px; the browser window couldn't be resized in this session.
