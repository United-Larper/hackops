import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session-cookie";

/** Open without signing in: sign-in, the portfolio (CV links), the bookmarklet script and what it and calendar apps fetch. */
const PUBLIC = /^\/(login|portfolio|fill\.js|signup-profile|calendar\.ics)(\/|$)/;
const HTTPS = (process.env.SITE_URL ?? "").startsWith("https:");

/**
 * Every page gets a Content-Security-Policy with a fresh nonce: only scripts Next renders with that nonce run, so
 * injected markup can't run script. Next reads the nonce from the request's CSP header and adds it to its own scripts.
 * Inline `style` attributes stay allowed: the board's widths and the icons use them, and styles can't run code.
 *
 * Then the sign-in check: anyone without a session cookie goes to the sign-in page, keeping where they were going.
 * That's only optimistic: the API decides whether the session is real, and lib/api.ts sends a stale one to /login.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!PUBLIC.test(pathname) && !request.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = [
    "default-src 'self'",
    // React's dev build uses eval for its error overlay; production never does.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(HTTPS ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  // Pages only: static files need no policy, and link prefetches would waste a nonce.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|icons/|logo\\.svg|icon\\.svg|favicon\\.ico).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }],
    },
  ],
};
