import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session-cookie";

/**
 * Sends anyone without a session cookie to the sign-in page, keeping where they were going.
 * Only an optimistic check: the API decides whether the session is real, and lib/api.ts sends a stale one to /login.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  // Public: sign-in, the portfolio (CV links) and its preview image, the bookmarklet script, and static files.
  matcher: ["/((?!login|portfolio|fill\\.js|_next/|icons/|logo\\.svg|icon\\.svg|favicon\\.ico).*)"],
};
