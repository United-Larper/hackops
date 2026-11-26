import type { NextConfig } from "next";

// ponytail: no script CSP; Next's inline scripts would need per-request nonces on every page. Add one before hosting.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" }, // no clickjacking: HackOps never runs inside another site's frame
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // URLs can carry ids and tokens; other sites get the origin only
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
