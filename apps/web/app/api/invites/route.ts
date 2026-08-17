import { acceptInvite, createInvite } from '@indenoi/core';

import { isKnownCity } from '../../../lib/city';
import { guarded, settle } from '../../../lib/guard';
import { badRequest, readJson, requireString } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Invitations are how a place fills up with people who already know each other.
 * They carry a city, not a permission: accepting one attaches nothing on its
 * own, it just tells us which cluster is growing and from whom.
 */
export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const geoScopeId = requireString(body, 'geoScopeId');
  if (geoScopeId === null || !isKnownCity(geoScopeId)) return badRequest('unknown_city');

  return settle(await createInvite(ports(), { actorId, geoScopeId }), 201);
});

export const PUT = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const code = requireString(body, 'code');
  if (code === null) return badRequest();

  return settle(await acceptInvite(ports(), { actorId, code }));
});
