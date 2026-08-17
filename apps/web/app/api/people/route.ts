import { getPeopleInCity } from '@indenoi/core';

import { isKnownCity } from '../../../lib/city';
import { guarded } from '../../../lib/guard';
import { badRequest, json, notFound } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * People discovery for one city. Minors are absent from it for adult viewers
 * (INV-AGE-3); that filter is in the policy layer, not here.
 */
export const GET = guarded(async (viewerId, request) => {
  const geoScopeId = new URL(request.url).searchParams.get('city') ?? '';
  if (!isKnownCity(geoScopeId)) return badRequest('unknown_city');

  const people = await getPeopleInCity(ports(), { viewerId, geoScopeId });
  return people === null ? notFound() : json({ people });
});
