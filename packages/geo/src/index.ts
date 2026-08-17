import type { GeoScope, GeoScopeId } from '@indenoi/core';

import { GAZETTEER } from './gazetteer';

export { GAZETTEER, GEO_ATTRIBUTION, CITY_IDS } from './gazetteer';

const BY_ID = new Map<GeoScopeId, GeoScope>(GAZETTEER.map((scope) => [scope.id, scope]));

const CITIES = GAZETTEER.filter((scope) => scope.kind === 'city');

/** Accent- and case-insensitive, so "montpellier" finds "Montpellier". */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const SEARCH_INDEX: readonly { readonly key: string; readonly scope: GeoScope }[] = CITIES.map(
  (scope) => ({ key: fold(scope.name), scope }),
);

export function getScope(id: GeoScopeId): GeoScope | undefined {
  return BY_ID.get(id);
}

export function listCities(): readonly GeoScope[] {
  return CITIES;
}

/** City, then region, then country. */
export function scopePath(id: GeoScopeId): readonly GeoScope[] {
  const path: GeoScope[] = [];
  let current = BY_ID.get(id);
  while (current !== undefined) {
    path.push(current);
    current = current.parentId === null ? undefined : BY_ID.get(current.parentId);
  }
  return path;
}

export function describeScope(id: GeoScopeId): string {
  const path = scopePath(id);
  const city = path[0];
  const country = path[path.length - 1];
  if (city === undefined) return 'Unknown place';
  return country === undefined || country.id === city.id ? city.name : `${city.name}, ${country.name}`;
}

/**
 * Prefix matches first, then substring matches, alphabetical within each group.
 * An empty query returns nothing: browsing every city on earth is not a feature,
 * and the caller should show the person's own places instead.
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
  return [...prefix.sort(byName), ...contains.sort(byName)].slice(0, limit);
}
