import { getDiscoverFeed } from '@indenoi/core';
import { describeScope, getScope } from '@indenoi/geo';

import { isKnownCity } from '../../../lib/city';
import { guarded } from '../../../lib/guard';
import { badRequest, json, notFound } from '../../../lib/responses';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * The Discover feed for one city.
 *
 * The city is a parameter, never a branch: any city in the gazetteer works the
 * same way, and the scores come back with the feed so the interface can explain
 * why a card is where it is (ADR-0008).
 */
export const GET = guarded(async (viewerId, request) => {
  const geoScopeId = new URL(request.url).searchParams.get('city') ?? '';
  if (!isKnownCity(geoScopeId)) return badRequest('unknown_city');

  const feed = await getDiscoverFeed(ports(), { viewerId, activeGeoScopeId: geoScopeId });
  if (feed === null) return notFound();

  const scope = getScope(geoScopeId);
  return json({
    city: {
      id: geoScopeId,
      name: scope?.name ?? 'Unknown place',
      label: describeScope(geoScopeId),
    },
    cards: feed.cards,
    followed: feed.followed,
  });
});
