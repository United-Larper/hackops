import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const HTTPS = (process.env.SITE_URL ?? "").startsWith("https:");

// The script policy (with its per-request nonce) is set on pages in proxy.ts; these go on every response.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" }, // no clickjacking: HackOps never runs inside another site's frame
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // URLs can carry ids and tokens; other sites get the origin only
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Once served over https, browsers refuse plain http for a year. Never sent on http, where it would be ignored anyway.
  ...(HTTPS ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // The two API routes that work without a session, served from this app's address, so the API itself never has
  // to be reachable from outside the computer running HackOps. Each still needs its owner's fill token.
  async rewrites() {
    return [
      { source: "/signup-profile", destination: `${API_URL}/signup-profile` },
      { source: "/calendar.ics", destination: `${API_URL}/calendar.ics` },
    ];
  },
};

export default nextConfig;
