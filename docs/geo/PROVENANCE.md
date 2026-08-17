# Geography data provenance

**Status: BASELINE — attribution LOCKED, identifiers UNVERIFIED.**

`packages/geo/src/gazetteer.ts` is a small, hand-curated gazetteer: **6
countries, 17 regions, 34 cities**. It is a *dataset*, not a code path. Adding a
city is adding a row, and nothing in the application may branch on which row it
is ([ADR-0004](../adr/0004-geography.md)).

> **Note on paths.** Source comments in `packages/geo/src/gazetteer.ts` and
> `packages/core/src/types.ts` refer to `docs/GEO_PROVENANCE.md` and
> `scripts/geo/verify-gazetteer.md`. This file supersedes both; the verification
> procedure that the second path would have held is in
> [Verification procedure](#verification-procedure) below.

## Source and licence

The identifier authority is **GeoNames** (<https://www.geonames.org/>), licensed
under **Creative Commons Attribution 4.0 International (CC BY 4.0)**
(<https://creativecommons.org/licenses/by/4.0/>).

CC BY 4.0 permits use and redistribution, including commercially and in modified
form, provided attribution is given and changes are indicated. Both obligations
apply here and are discharged as follows.

**Attribution string** (`GEO_ATTRIBUTION`, exported from `@indenoi/geo`):

> City and administrative data derived from GeoNames (geonames.org), licensed
> under CC BY 4.0.

It is rendered in the app footer. **Rendering it in the shipped UI is a release
blocker** ([RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)) — an attribution
that exists only in a constant is not attribution.

**Indication of changes**, as required by CC BY 4.0 §3(a)(1)(B): this is not a
reproduction of any GeoNames file. See below.

## What was actually done — stated honestly

**No GeoNames dump was ingested to produce this build.** The rows were typed by
hand from reference. Consequently:

- Every entry carries `provenance.verified: false`. This is the honest value and
  the tests assert it. Flipping it to `true` without performing the check below
  would be a provenance lie in a file whose entire purpose is provenance.
- **Cities** carry `source: 'geonames'` with a `sourceId` — the GeoNames
  `geonameid` as hand-entered. Unverified.
- **Countries and regions** carry `source: 'curated'` with `sourceId: null`.
  Regions are administrative groupings for which no confident GeoNames
  identifier was assigned; they are our own groupings, not GeoNames data.
- Centroids and IANA timezones on city rows are likewise hand-entered.

Nothing here is a bulk redistribution of the GeoNames database, so the practical
question at release is attribution and accuracy, not database-rights
compliance — but that assessment belongs to legal review, not to this file.

## Verification procedure

To be run before launch, and re-run whenever a row is added. This is the
procedure the (absent) `scripts/geo/verify-gazetteer.md` was to describe.

1. Download the official export from
   <https://download.geonames.org/export/dump/> — `cities500.zip` covers every
   settlement in this gazetteer, or `allCountries.zip` for completeness. Note
   the **dump date**; it is part of the provenance record.
2. For each city row, look up the `sourceId` in the dump and confirm **all** of:
   - the `geonameid` exists;
   - the canonical name matches the row's `name` (or is a documented exonym);
   - the ISO-3166-1 alpha-2 country code matches `countryCode`;
   - latitude/longitude agree with `centroid` to a sensible tolerance
     (a few hundredths of a degree — these are city centroids, not addresses);
   - the IANA timezone matches;
   - the feature class/code is a populated place (`P`), not an administrative
     division.
3. Where a row checks out, set `verified: true` **for that row only**. Never
   flip the flag in bulk.
4. Where it does not, correct the row — do not silently drop the id.
5. Record in this file: the dump date, who ran the check, and how many rows
   passed.

| Dump date | Checked by | Rows verified | Notes |
|---|---|---|---|
| *never run* | — | 0 / 34 | Initial hand-entered capture. |

## Privacy boundary

A **place** may carry a centroid. A **person** never may — no domain type
attached to a person can hold coordinates, and none of the public projections
expose one (`INV-GEO-1`, [SAFETY.md](../SAFETY.md)).

This is worth stating on the provenance page specifically, because the gazetteer
is the only place in the codebase where coordinates legitimately exist. The
temptation to "just attach the city centroid to the user for convenience" is the
exact thing the invariant forbids: a centroid attached to a person is a location
attached to a person, whatever its resolution.

Sub-city (`neighbourhood`) scopes are supported by the type system and
deliberately absent from the dataset. Finer scopes narrow a person's location
and require their own analysis against `INV-GEO-1` before any are added
([NON_GOALS.md](../NON_GOALS.md)).

## Current coverage

France (Ajaccio, Bastia, Porto-Vecchio, Corte, Marseille, Nice, Aix-en-Provence,
Toulon, Paris, Saint-Denis, Lyon, Grenoble, Montpellier, Toulouse, Perpignan,
Bordeaux, Biarritz, Rennes, Brest), Ireland (Kilrush, Ennis, Galway, Cork,
Dublin), Portugal (Porto, Braga, Lisboa), Spain, Italy and Belgium.

The starting set reflects where the first cohort is expected, not any judgement
about which places matter. No city is privileged anywhere in the code.
