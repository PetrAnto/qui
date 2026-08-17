import { track, type AnalyticsEventName } from '@indenoi/core';

import { isKnownCity } from '../../../lib/city';
import { guarded } from '../../../lib/guard';
import { badRequest, json, oneOf, optionalString, readJson } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * View instrumentation.
 *
 * Only three events can be reported from the browser, and only the fields the
 * closed analytics shape already has (INV-ANALYTICS-1). Everything else in the
 * body is dropped on the floor rather than merged: a client cannot widen what
 * the analytics store is able to hold.
 */
const VIEW_EVENTS: readonly AnalyticsEventName[] = [
  'discover_impression',
  'content_open',
  'profile_open',
];

export const POST = guarded(async (actorId, request) => {
  const body = await readJson(request);
  if (body === null) return badRequest();
  const name = oneOf(body, 'name', VIEW_EVENTS);
  if (name === null) return badRequest('unsupported_event');

  const geoScopeId = optionalString(body, 'geoScopeId');
  await track(ports(), {
    name,
    actorId,
    geoScopeId: geoScopeId !== null && isKnownCity(geoScopeId) ? geoScopeId : null,
    practice: optionalString(body, 'practice'),
    targetId: optionalString(body, 'targetId'),
  });
  return json({ tracked: true }, 202);
});
