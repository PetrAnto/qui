import { track } from '@indenoi/core';

import { activeCityCookieHeader, isKnownCity } from '../../../lib/city';
import { guarded } from '../../../lib/guard';
import { badRequest, json, readJson, requireString } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Switching city. No evidence, no permission, no ceremony — the whole point of
 * the product is that a person can be in more than one place.
 */
export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const geoScopeId = requireString(body, 'geoScopeId');
  if (geoScopeId === null || !isKnownCity(geoScopeId)) return badRequest('unknown_city');

  await track(ports(), { name: 'city_switched', actorId, geoScopeId });
  return json({ geoScopeId }, 200, { 'set-cookie': activeCityCookieHeader(geoScopeId) });
});
