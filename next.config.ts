import type { NextConfig } from "next";

// Pragmatic baseline CSP. Next's App Router injects inline bootstrap/styles, so
// script/style allow 'unsafe-inline'; a nonce-based strict CSP via middleware is
// a documented follow-up. No external origins are permitted.
//
// In development, Next's Fast Refresh / webpack HMR evaluates code via eval(),
// which requires 'unsafe-eval'; without it client JS never runs and nothing on
// the page is interactive. Production builds do not use eval, so the strict
// policy applies there. `connect-src` also needs ws: in dev for the HMR socket.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";
const connectSrc = isDev ? "connect-src 'self' ws:" : "connect-src 'self'";

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  connectSrc,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for container deployment.
  output: "standalone",
  // Prisma client is server-only; keep it external to the server bundle.
  serverExternalPackages: ["@prisma/client", "prisma"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
