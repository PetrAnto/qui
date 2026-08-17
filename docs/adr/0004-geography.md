# ADR-0004 — Geography is data, and never person-level

**Status: LOCKED** for both halves: no code branches on a place, and no person
carries a coordinate (`INV-GEO-1`).

## Context

A local product needs to know where things are. The obvious implementations are
also the two worst: hard-coding a launch city into the application, and
attaching a user's location to their account.

The first makes every subsequent city a fork. The second creates the highest-harm
data in the product — a location attached to a named person, in a product that
admits 15-year-olds and is designed for towns where everyone is findable.

## Decision

### Geography is a dataset

`packages/geo/src/gazetteer.ts` holds 6 countries, 17 regions and 34 cities as
rows. **Nothing in the application may branch on which row it is.** Adding a
city is adding a row; there is no per-city configuration, no per-city feature
flag and no privileged city.

Scopes are administrative and hierarchical (`country` → `region` → `city` →
`neighbourhood`), identified by GeoNames ids where one exists. Provenance,
licensing and the verification procedure:
[geo/PROVENANCE.md](../geo/PROVENANCE.md).

**The active city is a cookie**, not a query parameter, so Discover, Signals and
People all agree on where "here" is without threading it through every link.

### Switching city is free; publishing into one is not

Exploring anywhere is a right and requires no evidence and no permission.
Speaking *as a local* requires a tie to that place
([ADR-0003](0003-trust-evidence-capabilities.md)).

### A place may carry a centroid; a person may not

`GeoScope` has a centroid and a timezone. **No domain type attached to a person
can hold coordinates**, and no public projection exposes one (`INV-GEO-1`). The
strongest form of this rule is structural: the types cannot express it, so it
cannot be forgotten.

There is no live location, no check-in, no distance search and no
"people near you" by metres. Proximity here means *a declared tie to an
administrative scope*.

## Consequences

**Good.** Adding a city is a data change reviewable by anyone. Every safety and
ranking rule is automatically identical everywhere. The highest-harm data in the
product simply does not exist, so it cannot leak, be subpoenaed, or be sold.

**Bad.** No proximity features, ever, while this stands — no "3 people within
500m", which is a genuinely useful thing the product forgoes. City-level
granularity is coarse for a large city like Paris; `neighbourhood` exists in the
type system and is deliberately unused, because finer scopes narrow a person's
location and need their own analysis.

**Neutral.** Every gazetteer entry is currently `verified: false` because the
rows were hand-entered rather than ingested from the official export. Verifying
them is a release-checklist item.

## Alternatives considered

- **Per-city configuration or launch flags.** Every one becomes a branch, and
  branches are where safety rules diverge.
- **Store a coarse home location per user.** "Coarse" degrades: a centroid
  attached to a person is a location attached to a person, whatever its
  resolution.
- **Postal codes as the scope unit.** Finer, and in a village a postal code is
  close to an address.
- **Ingest the full GeoNames dump.** Correct at scale; today 34 hand-checked
  rows are more honest than 4 million unreviewed ones.
