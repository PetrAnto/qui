import { createSignal, SIGNAL_TYPES, type SignalType } from '@indenoi/core';

import { isKnownCity } from '../../../lib/city';
import { guarded, settle } from '../../../lib/guard';
import {
  badRequest,
  oneOf,
  optionalString,
  readJson,
  requireString,
} from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();

  // The type is validated against the domain vocabulary, so an intent that does
  // not exist in this product cannot be introduced through the wire.
  const type = oneOf<SignalType>(body, 'type', SIGNAL_TYPES);
  const title = requireString(body, 'title');
  const geoScopeId = requireString(body, 'geoScopeId');
  if (type === null || title === null || geoScopeId === null) return badRequest();
  if (!isKnownCity(geoScopeId)) return badRequest('unknown_city');

  const capacityValue = body['capacity'];
  return settle(
    await createSignal(ports(), {
      actorId,
      type,
      title,
      body: optionalString(body, 'body') ?? '',
      geoScopeId,
      practice: optionalString(body, 'practice'),
      placeLabel: optionalString(body, 'placeLabel'),
      startsAt: optionalString(body, 'startsAt'),
      expiresAt: optionalString(body, 'expiresAt'),
      capacity:
        typeof capacityValue === 'number' && capacityValue > 0 ? Math.floor(capacityValue) : null,
      linkedPostId: optionalString(body, 'linkedPostId'),
    }),
    201,
  );
});
