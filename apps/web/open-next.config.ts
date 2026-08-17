import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext → Cloudflare Workers (ADR-0001).
 *
 * Deliberately minimal. The incremental cache, tag cache and queue adapters are
 * all left at their defaults, because this build has nothing to cache: every
 * route is `force-dynamic` and every response is personalised through the
 * viewer's blocks, age band and capabilities (INV-CACHE-1). Wiring an R2 or KV
 * cache in front of that would be the single easiest way to serve one person's
 * feed to another, so it is not wired in.
 *
 * When persistence lands (ADR-0011, `persistentDatabase` flag), the D1 binding
 * goes in `wrangler.jsonc`; nothing in this file needs to change.
 */
export default defineCloudflareConfig();
