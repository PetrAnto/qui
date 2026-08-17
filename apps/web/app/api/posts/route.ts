import { createPost } from '@indenoi/core';

import { isKnownCity } from '../../../lib/city';
import { guarded, settle } from '../../../lib/guard';
import { badRequest, optionalString, readJson, requireString } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Publishing into a place. The evidence check lives in `canPublishInGeo`; this
 * handler only refuses input it cannot parse.
 *
 * `motif` picks one of the generated artwork palettes. There is no upload path
 * in this build (ADR-0007, `mediaUploads` flag).
 */
export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const geoScopeId = requireString(body, 'geoScopeId');
  const caption = requireString(body, 'caption');
  if (geoScopeId === null || !isKnownCity(geoScopeId)) return badRequest('unknown_city');
  if (caption === null) return badRequest();

  return settle(
    await createPost(ports(), {
      actorId,
      geoScopeId,
      caption,
      practice: optionalString(body, 'practice'),
      motif: optionalString(body, 'motif') ?? 'wave',
    }),
    201,
  );
});
