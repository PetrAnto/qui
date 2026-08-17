# Geography data provenance

**Status: BASELINE — attribution LOCKED.** Seed identifiers remain
UNVERIFIED until the table below is updated. The worldwide index is
derived from an official GeoNames dump and is marked `verified: true`
for dump-backed rows only.

`packages/geo` holds two datasets:

1. A **hand-curated seed** (`gazetteer.ts`) of 6 countries, 17 regions
   and 34 cities used by the demo cast.
2. A **worldwide search index** (`generated/world-cities.json`) built
   from GeoNames `cities15000` (settlements ≥ 15,000 people). Search
   and activation use this index. Adding a city is choosing a row, not
   shipping a code change ([ADR-0004](../adr/0004-geography.md)).

The 15,000-person dump is a **coverage baseline**, not the product
boundary. Smaller places already in the seed (Kilrush, Corte, …) stay
searchable. A later dump (`cities500` / `cities1000`) can replace the
index without changing application code.

## Source and licence

The identifier authority is **GeoNames** (<https://www.geonames.org/>),
licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**
(<https://creativecommons.org/licenses/by/4.0/>).

**Attribution string** (`GEO_ATTRIBUTION`):

> City and administrative data derived from GeoNames (geonames.org), licensed
> under CC BY 4.0.

It is rendered in the app footer.

**Indication of changes:** this is not a verbatim GeoNames file. The world
index keeps a compact tuple per populated place (id, names, country,
admin1, centroid, timezone, population). Alternate-name columns and
unused fields are dropped.

## What was actually done

| Dataset | How it was built | `verified` |
|---|---|---|
| Seed gazetteer | Hand-typed from reference | `false` until the procedure below is run per row |
| World index | `scripts/geo/build-world-index.mjs` over `cities15000.txt` | `true` for dump-backed rows |

Rebuild:

```sh
curl -fsSL -o /tmp/geonames/cities15000.zip https://download.geonames.org/export/dump/cities15000.zip
unzip -o /tmp/geonames/cities15000.zip -d /tmp/geonames
node scripts/geo/build-world-index.mjs
```

| Dump | Built | Rows |
|---|---|---|
| GeoNames cities15000 | 2026-08-17 | 34,099 |

## Privacy boundary

A **place** may carry a centroid. A **person** never may (`INV-GEO-1`).
World-city centroids live only on the place record.

## Current coverage

- Seed: France, Ireland, Portugal, Spain, Italy, Belgium (see
  `packages/geo/src/gazetteer.ts`).
- World index: every populated place in GeoNames `cities15000`.
- No city is privileged in application code.
