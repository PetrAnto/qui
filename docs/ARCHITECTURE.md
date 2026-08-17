# Architecture

**Status: BASELINE.** The layering is settled; the runtime and persistence
choices are recorded in [ADR-0001](adr/0001-framework-runtime.md) and
[ADR-0011](adr/0011-persistence-boundary.md).

## Shape

```
apps/web            Next.js 16 App Router — UI and route handlers only
  app/api/*         route handlers: parse, authorise via guard, call a service
  lib/              session, cookies, features, presentation helpers
packages/core       pure domain: types, policy, ranking, services, projections
packages/db         repository implementations + Drizzle schema + demo seed
packages/geo        the gazetteer dataset (34 cities, 6 countries)
```

The dependency direction is one-way: `web → core`, `web → db`, `db → core`,
`geo → core`. `core` depends on nothing but itself.

## Why the domain is pure

`packages/core` has no `fetch`, no database client, no framework import, and no
ambient clock — time enters policy as an `Instant` parameter. Two consequences
that are the whole reason for the constraint:

- The safety invariants run as plain unit tests in milliseconds, with no server,
  no browser and no database. A safety gate that is slow is a safety gate people
  learn to skip.
- Swapping the in-memory repository for D1 cannot change a policy outcome,
  because policy never sees a repository.

## The layers, in the order a request crosses them

1. **Route handler** (`apps/web/app/api/**`). Parses input, resolves the viewer
   through `lib/guard.ts`, calls exactly one service. It does not re-derive
   policy. A policy check in a route handler or a component is a bug — the rule
   would then exist in two places and only one of them would be tested.
2. **Service** (`core/src/services/`). Split `read` / `write`. Loads what policy
   needs, calls policy, performs the write, emits the analytics event. Returns a
   result value; it does not throw for a denied decision.
3. **Policy** (`core/src/policy/`). Pure functions returning a `Decision` —
   `ALLOW`, or a deny with a named reason. Named reasons matter: `deny('blocked')`
   and `deny('age_band_mismatch')` are different facts, and collapsing them into
   `false` makes the safety tests untestable.
4. **Repository** (`core/src/repository.ts`, implemented in `packages/db`).
   Async and id-addressed throughout, so the D1 implementation slots in without
   touching a caller.
5. **Projection** (`core/src/projections.ts`). The last line of defence: what a
   given viewer is allowed to see, reduced to the shape that leaves the domain.
   `INV-GEO-1` and `INV-PROFILE-1` are enforced here as well as structurally.

## Capabilities, not roles

`deriveCapabilities(person, evidence)` returns a `Set<Capability>` computed from
evidence at read time. There is no stored role ladder and no cached capability
set — a capability that is persisted is a capability that can go stale after a
suspension or a revoked attestation.

The only stored `role` is `'member' | 'moderator'`, and moderator is a platform
function, not a trust tier. Hosts are not moderators
([ADR-0010](adr/0010-moderation-hosts-and-blocks.md)).

## Geography is a dataset

`packages/geo/src/gazetteer.ts` is 6 countries, 17 regions and 34 cities as
data. Nothing in the application branches on which row it is; the active city
is a cookie so every surface agrees on where "here" is without threading it
through every link. Provenance and licensing:
[geo/PROVENANCE.md](geo/PROVENANCE.md).

## Runtime and caching

Next.js 16 on Cloudflare Workers via OpenNext
([ADR-0001](adr/0001-framework-runtime.md)). Every route is dynamic and every
response is personalised. The incremental cache, tag cache and queue adapters
are left at their defaults and **no R2 or KV cache is wired in** — a shared
cache in front of a personalised feed would serve one person's view to another
(`INV-CACHE-1`).

`wrangler.jsonc` carries no account id and no D1 database id, so
`wrangler deploy` cannot succeed against the wrong target by accident. That is
intentional: provisioning is a decision for a human with an account.

## Persistence

The demo build uses `createInMemoryRepository` — a full, honest implementation
of the repository interface, not a stub. Its limitation is stated plainly: state
lives in the isolate and resets.

The Drizzle schema and the initial migration (`packages/db/migrations/0000_init.sql`,
293 statements, SQLite/D1 dialect) exist and are checked, but **no database has
been created and no migration has been applied anywhere**. Persistence is behind
the `persistentDatabase` flag ([ADR-0011](adr/0011-persistence-boundary.md)).

## Decision record index

| ADR | Topic | Status |
|---|---|---|
| [0001](adr/0001-framework-runtime.md) | Framework and runtime | BASELINE |
| [0002](adr/0002-age-boundary.md) | Age boundary (15+) | BASELINE (invariants LOCKED) |
| [0003](adr/0003-trust-evidence-capabilities.md) | Trust as evidence, not score | LOCKED |
| [0004](adr/0004-geography.md) | Geography as data | LOCKED |
| [0005](adr/0005-authentication-dev-boundary.md) | Authentication / dev boundary | DEFERRED (boundary LOCKED) |
| [0006](adr/0006-kyc-boundary.md) | KYC boundary | LOCKED |
| [0007](adr/0007-media.md) | Media | DEFERRED (boundary LOCKED) |
| [0008](adr/0008-ranking-and-discover.md) | Ranking and Discover | BASELINE |
| [0009](adr/0009-signal-intent-scope.md) | Signal intent scope (MVP four intents) | LOCKED (romance claim superseded by 0013) |
| [0013](adr/0013-romance-deferred-not-forbidden.md) | Adult romance deferred, not banned | LOCKED |
| [0014](adr/0014-public-brand-qui.md) | Public brand QUI / qui.social | LOCKED |
| [0015](adr/0015-public-synthetic-demo.md) | Synthetic demo deploy vs production | LOCKED |
| [0010](adr/0010-moderation-hosts-and-blocks.md) | Moderation, hosts, blocks | LOCKED |
| [0011](adr/0011-persistence-boundary.md) | Persistence boundary | DEFERRED (interface LOCKED) |
| [0012](adr/0012-messaging-scope.md) | Messaging scope | LOCKED |

ADR numbers 0001–0011 are cited by number in source comments. Do not renumber
them.
