import { cookies } from 'next/headers';

import type { GeoScope, GeoScopeId, Ports } from '@indenoi/core';
import { getMyPlaces } from '@indenoi/core';
import { getScope, listCities } from '@indenoi/geo';

import { readCookie, serializeCookie } from './cookies';

/**
 * The active city.
 *
 * Switching city is free and unconditional: exploring anywhere is a right, and
 * no city is privileged anywhere in the code (ADR-0004). The choice is a cookie
 * rather than a query parameter so that every surface — Discover, Signals,
 * People — agrees on where "here" is without threading it through forty links.
 */
export const ACTIVE_CITY_COOKIE = 'indenoi_active_city';

export function isKnownCity(geoScopeId: string): boolean {
  return getScope(geoScopeId)?.kind === 'city';
}

export function activeCityFrom(request: Request): GeoScopeId | null {
  const value = readCookie(request, ACTIVE_CITY_COOKIE);
  return value !== null && isKnownCity(value) ? value : null;
}

export function activeCityCookieHeader(geoScopeId: GeoScopeId): string {
  return serializeCookie(ACTIVE_CITY_COOKIE, geoScopeId, { maxAgeSeconds: 60 * 60 * 24 * 180 });
}

async function activeCityCookie(): Promise<GeoScopeId | null> {
  const store = await cookies();
  const value = store.get(ACTIVE_CITY_COOKIE)?.value;
  return value !== undefined && isKnownCity(value) ? value : null;
}

/**
 * Cookie first, then the person's own first place, then the first city in the
 * gazetteer. The last fallback exists so a brand-new account still sees a
 * populated product rather than an empty state.
 */
export async function resolveActiveCity(ports: Ports, userId: string | null): Promise<GeoScope> {
  const chosen = await activeCityCookie();
  if (chosen !== null) {
    const scope = getScope(chosen);
    if (scope !== undefined) return scope;
  }
  if (userId !== null) {
    const attachments = await ports.repo.listAttachments(userId);
    for (const attachment of attachments) {
      const scope = getScope(attachment.geoScopeId);
      if (scope !== undefined) return scope;
    }
  }
  const [first] = listCities();
  if (first === undefined) throw new Error('gazetteer is empty');
  return first;
}

/**
 * How the active city relates to the viewer, in consumer language.
 *
 * `exploring` — looking is free and claims nothing; `visitor` — a declared tie
 * that does not (yet) grant local publishing; `local` — publishing access.
 * This is the only mapping the UI may use: no raw trust-policy or GPS evidence
 * crosses into the interface (canon 04 §2.3).
 */
export type CityAccess = 'exploring' | 'visitor' | 'local';

export async function resolveCityAccess(
  ports: Ports,
  userId: string,
  geoScopeId: GeoScopeId,
): Promise<CityAccess> {
  const places = await getMyPlaces(ports, userId);
  const place = places.find((entry) => entry.geoScopeId === geoScopeId);
  if (place === undefined || place.kind === 'exploring') return 'exploring';
  return place.canPublishLocally ? 'local' : 'visitor';
}
