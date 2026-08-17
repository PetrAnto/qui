import { addCity, removeCity, type GeoAttachmentKind } from '@indenoi/core';
import { describeScope, searchCities } from '@indenoi/geo';

import { guarded, settle } from '../../../lib/guard';
import { ATTACHMENT_KINDS } from '../../../lib/kinds';
import { badRequest, json, oneOf, readJson, requireString } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * City search is a public gazetteer lookup. It names places, not people, so it
 * is available before a session exists (onboarding). Adding or removing a
 * place still requires an actor.
 */
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  return json({
    cities: searchCities(query).map((scope) => ({
      id: scope.id,
      name: scope.name,
      countryCode: scope.countryCode,
      label: describeScope(scope.id),
    })),
  });
}

export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();

  const geoScopeId = requireString(body, 'geoScopeId');
  const kind = oneOf<GeoAttachmentKind>(body, 'kind', ATTACHMENT_KINDS);
  if (geoScopeId === null || kind === null) return badRequest();

  return settle(await addCity(ports(), { actorId, geoScopeId, kind }), 201);
});

export const DELETE = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const geoScopeId = requireString(body, 'geoScopeId');
  if (geoScopeId === null) return badRequest();

  return settle(await removeCity(ports(), { actorId, geoScopeId }));
});
