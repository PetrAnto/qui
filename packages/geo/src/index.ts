import type { GeoScope, GeoScopeId } from '@indenoi/core';

import { GAZETTEER } from './gazetteer';
import { fold, getWorldCity, searchWorldCities } from './world';

export { GAZETTEER, GEO_ATTRIBUTION, CITY_IDS } from './gazetteer';
export { WORLD_CITY_COUNT, WORLD_DUMP_DATE, worldCityId, parseWorldCityId } from './world';

const BY_ID = new Map<GeoScopeId, GeoScope>(GAZETTEER.map((scope) => [scope.id, scope]));

const CITIES = GAZETTEER.filter((scope) => scope.kind === 'city');

const SEED_GEONAME_IDS = new Set(
  CITIES.map((scope) => scope.provenance.sourceId).filter((id): id is string => id !== null),
);

const SEED_BY_GEONAME = new Map<string, GeoScope>();
for (const scope of CITIES) {
  if (scope.provenance.sourceId !== null) SEED_BY_GEONAME.set(scope.provenance.sourceId, scope);
}

const SEARCH_INDEX: readonly { readonly key: string; readonly scope: GeoScope }[] = CITIES.map(
  (scope) => ({ key: fold(scope.name), scope }),
);

export function getScope(id: GeoScopeId): GeoScope | undefined {
  const seed = BY_ID.get(id);
  if (seed !== undefined) return seed;
  const world = getWorldCity(id);
  if (world === undefined) return undefined;
  // Prefer the hand-curated row when the same GeoNames id already exists.
  return SEED_BY_GEONAME.get(world.provenance.sourceId ?? '') ?? world;
}

export function listCities(): readonly GeoScope[] {
  return CITIES;
}

/** City, then region, then country. World cities have no parent row. */
export function scopePath(id: GeoScopeId): readonly GeoScope[] {
  const path: GeoScope[] = [];
  let current = getScope(id);
  const seen = new Set<GeoScopeId>();
  while (current !== undefined && !seen.has(current.id)) {
    seen.add(current.id);
    path.push(current);
    current = current.parentId === null ? undefined : getScope(current.parentId);
  }
  return path;
}

export function describeScope(id: GeoScopeId): string {
  const path = scopePath(id);
  const city = path[0];
  if (city === undefined) return 'Unknown place';
  const country = path[path.length - 1];
  if (country !== undefined && country.id !== city.id) return `${city.name}, ${country.name}`;
  return city.countryCode.length > 0 ? `${city.name}, ${city.countryCode}` : city.name;
}

/**
 * Prefix matches first, then substring matches. Seed cities stay first so the
 * demo cast does not jump to a larger namesake. An empty query returns nothing:
 * browsing every city on earth is not a feature.
 */
export function searchCities(query: string, limit = 12): readonly GeoScope[] {
  const needle = fold(query);
  if (needle.length === 0) return [];

  const prefix: GeoScope[] = [];
  const contains: GeoScope[] = [];
  for (const entry of SEARCH_INDEX) {
    if (entry.key.startsWith(needle)) prefix.push(entry.scope);
    else if (entry.key.includes(needle)) contains.push(entry.scope);
  }
  const byName = (a: GeoScope, b: GeoScope): number => (a.name < b.name ? -1 : 1);
  const seed = [...prefix.sort(byName), ...contains.sort(byName)];
  const seen = new Set(seed.map((scope) => `${fold(scope.name)}|${scope.countryCode}`));
  const world = searchWorldCities(query, {
    limit: Math.max(limit, 24),
    excludeGeonameIds: SEED_GEONAME_IDS,
  }).filter((scope) => {
    const key = `${fold(scope.name)}|${scope.countryCode}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...seed, ...world].slice(0, limit);
}
