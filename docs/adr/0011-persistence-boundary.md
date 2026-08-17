# ADR-0011 — Persistence boundary

**Status: DEFERRED** for the database. **LOCKED** for the repository interface
and for the rule that persistence cannot change a policy outcome.

## Context

The MVP needs to exercise every product and safety rule end to end. It does not
need a provisioned database to do that — and provisioning one means an account,
a bill, a backup policy, a retention policy and a legal basis for holding
personal data, none of which exist yet
([RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)).

## Decision

**A repository interface owns the boundary.** `core/src/repository.ts` is async
and id-addressed throughout, so a D1/Drizzle implementation slots in without
touching a caller. Policy never sees a repository, which is what guarantees that
swapping the store cannot change an authorisation outcome.

**The demo store is a full implementation, not a stub.**
`createInMemoryRepository` implements the whole interface honestly. Its
limitation is stated plainly rather than worked around: **state lives in the
server isolate and resets.**

**The schema exists; nothing has been provisioned.** The Drizzle schema and
`packages/db/migrations/0000_init.sql` (293 lines, SQLite/D1 dialect, journal
entry `0000_init`) are generated and checked in. **No database has been created
and no migration has been applied anywhere.**

**D1 sits behind `persistentDatabase`** (`INDENOI_FEATURE_D1`), default off. The
binding is **commented out** in `wrangler.jsonc` rather than pointed at a
placeholder id, so `wrangler deploy` cannot succeed against the wrong database.

**Enabling it requires re-running every safety invariant against the D1
implementation.** The invariants are currently verified against the in-memory
repository; a store that returns rows in a different shape, or that leaks a
field a projection assumed absent, is exactly how `INV-GEO-1` or
`INV-PROFILE-1` would regress silently.

## Consequences

**Good.** No account, no bill, no personal data held, no retention obligation —
while the product is still deciding what it is. Tests run in milliseconds
against real code rather than mocks, which is why the safety gate is fast enough
that nobody skips it.

**Bad.** Nothing about the persistent path is proven: no query performance, no
migration rehearsal, no backup/restore test, no concurrency behaviour. Multiple
isolates would see different demo state, which makes the demo unsuitable for
anything but a demo. Nothing in [EXPERIMENTS.md](../EXPERIMENTS.md) can run
until this lands.

**Neutral.** SQLite/D1 semantics are already baked into the schema; moving to
Postgres later would be a real migration, not a config change.

## Alternatives considered

- **Provision D1 now.** Would prove the path — and would mean creating an
  account and a database before a controller entity exists to own the data.
- **Ship a stubbed repository that throws.** Nothing end to end would work, and
  the invariants would have nothing real to run against.
- **SQLite on disk locally.** Closer to production, and unavailable on Workers,
  so it would prove the wrong thing.
- **Durable Objects for state.** Plausible for threads; a larger design decision
  than the MVP needs, and it would fragment where the invariants must hold.
