# ADR-0001 — Framework and runtime

**Status: BASELINE.** Revisitable; nothing in the domain depends on it.

## Context

The product is mobile-first, geographically distributed across several European
countries, and personalised on every response — the viewer's blocks, age band
and capabilities change what any given page contains. It also has, for now, no
budget, no operator and no traffic.

## Decision

Next.js 16 (App Router, React 19) deployed to **Cloudflare Workers via OpenNext**
(`@opennextjs/cloudflare`). pnpm workspaces, TypeScript throughout, Vitest for
unit tests, Playwright for a mobile smoke suite.

Two constraints follow and are not negotiable while this ADR stands:

1. **The domain does not import the framework.** `packages/core` is pure
   TypeScript with no `fetch`, no framework import and no ambient clock. If this
   ADR is superseded, the domain and all its safety tests move unchanged.
2. **No shared response cache.** Every route is dynamic; the incremental cache,
   tag cache and queue adapters stay at their defaults, and no R2 or KV cache is
   placed in front of the app (`INV-CACHE-1`).

## Consequences

**Good.** One language across domain, server and UI. Edge deployment close to
European users at essentially zero idle cost. Server components let the
authorisation boundary sit on the server by default, so a projection leak
requires actively sending the wrong thing rather than forgetting a client-side
check.

**Bad.** Workers is not Node: some libraries will not run, and the D1 binding
shapes the persistence choice ([ADR-0011](0011-persistence-boundary.md)).
OpenNext is a compatibility layer, and compatibility layers lag. Rendering every
response dynamically forgoes the framework's main performance story — accepted
deliberately, because a cache in front of a personalised feed is the easiest
possible way to serve one person's view to another.

**Neutral.** `wrangler.jsonc` carries no account id and no database id, so
`wrangler deploy` cannot succeed against the wrong target. Provisioning is a
human decision ([RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)).

## Alternatives considered

- **Remix / SvelteKit / plain Hono.** Any would work. Next was chosen for
  server-component ergonomics around the authorisation boundary.
- **Node on a VPS.** Simpler runtime, but an operator, a patch cadence and a
  single region — worse on all three for a product spread across countries.
- **Static + client-side API.** Incompatible with the posture: personalisation
  and filtering must happen server-side or the invariants become advisory.
