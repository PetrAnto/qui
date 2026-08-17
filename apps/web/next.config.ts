import type { NextConfig } from 'next';

/**
 * Response headers are part of the safety surface, so they are configured here
 * rather than left to a reverse proxy that this project does not control.
 *
 *  - `geolocation=()` is not decoration: the product has no person-level
 *    location and must never acquire one by accident (INV-GEO-1). Denying the
 *    permission outright means a future component cannot quietly ask for it.
 *  - the CSP allows inline styles because the generated artwork is a computed
 *    gradient per card. It also still allows inline scripts, because the App
 *    Router injects its own bootstrap payload inline; tightening that to a
 *    per-request nonce needs middleware and is on RELEASE_CHECKLIST.md rather
 *    than pretended to be done here.
 *  - API responses add `cache-control: private, no-store` themselves; see
 *    `lib/responses.ts`.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'content-security-policy', value: CSP },
          { key: 'referrer-policy', value: 'no-referrer' },
          { key: 'x-content-type-options', value: 'nosniff' },
          { key: 'x-frame-options', value: 'DENY' },
          {
            key: 'permissions-policy',
            value: 'geolocation=(), camera=(), microphone=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
