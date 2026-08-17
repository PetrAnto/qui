import type { GeoScope, GeoScopeId } from '@indenoi/core';

import worldDump from './generated/world-cities.json';

/**
 * Compact GeoNames cities15000 index.
 *
 * Rows are tuples so the dump stays data. A city becomes a `GeoScope` only
 * when it is looked up or chosen — never as a privileged code path.
 */
type WorldRow = readonly [
  geonameId: number,
  name: string,
  asciiName: string,
  countryCode: string,
  admin1: string,
  lat: number,
  lng: number,
  tz: string,
  population: number,
];

interface WorldDump {
  readonly source: string;
  readonly license: string;
  readonly builtAt: string;
  readonly count: number;
  readonly cities: readonly WorldRow[];
}

const dump = worldDump as unknown as WorldDump;

export const WORLD_CITY_COUNT = dump.count;
export const WORLD_DUMP_DATE = dump.builtAt;
export const WORLD_CITY_PREFIX = 'geo:city:gn-';

export function worldCityId(geonameId: number): GeoScopeId {
  return `${WORLD_CITY_PREFIX}${geonameId}`;
}

export function parseWorldCityId(id: string): number | null {
  if (!id.startsWith(WORLD_CITY_PREFIX)) return null;
  const n = Number.parseInt(id.slice(WORLD_CITY_PREFIX.length), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toScope(row: WorldRow): GeoScope {
  const [geonameId, name, , countryCode, , lat, lng, tz] = row;
  return {
    id: worldCityId(geonameId),
    kind: 'city',
    name,
    parentId: null,
    countryCode,
    timezone: tz.length > 0 ? tz : null,
    centroid: { lat, lng },
    provenance: { source: 'geonames', sourceId: String(geonameId), verified: true },
  };
}

const BY_GEONAME = new Map<number, WorldRow>(dump.cities.map((row) => [row[0], row]));

export function getWorldCity(id: GeoScopeId): GeoScope | undefined {
  const geonameId = parseWorldCityId(id);
  if (geonameId === null) return undefined;
  const row = BY_GEONAME.get(geonameId);
  return row === undefined ? undefined : toScope(row);
}

export function searchWorldCities(
  query: string,
  options: { readonly limit?: number; readonly excludeGeonameIds?: ReadonlySet<string> } = {},
): readonly GeoScope[] {
  const needle = fold(query);
  if (needle.length === 0) return [];
  const limit = options.limit ?? 12;
  const exclude = options.excludeGeonameIds;

  const prefix: WorldRow[] = [];
  const contains: WorldRow[] = [];
  for (const row of dump.cities) {
    const geonameId = String(row[0]);
    if (exclude?.has(geonameId) === true) continue;
    const nameKey = fold(row[1]);
    const asciiKey = row[2].length > 0 ? fold(row[2]) : '';
    const hit =
      nameKey.startsWith(needle) ||
      asciiKey.startsWith(needle) ||
      nameKey.includes(needle) ||
      (asciiKey.length > 0 && asciiKey.includes(needle));
    if (!hit) continue;
    if (nameKey.startsWith(needle) || asciiKey.startsWith(needle)) prefix.push(row);
    else contains.push(row);
  }

  const byPop = (a: WorldRow, b: WorldRow): number => b[8] - a[8] || a[1].localeCompare(b[1]);
  return [...prefix.sort(byPop), ...contains.sort(byPop)].slice(0, limit).map(toScope);
}
