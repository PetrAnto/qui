import { redirect } from 'next/navigation';

import { getMyPlaces } from '@indenoi/core';

import { InvitePanel } from '../../components/InvitePanel';
import { PlacesManager } from '../../components/PlacesManager';
import { currentUserId } from '../../lib/session';
import { ports } from '../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Places.
 *
 * A person is not from one city. They live somewhere, work somewhere else, have
 * family in a third and are curious about a fourth, and the product is built
 * around that rather than around a single "home town" field.
 */
export default async function PlacesPage() {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const places = await getMyPlaces(ports(), viewerId);

  return (
    <>
      <header className="pagehead">
        <h1>Your places</h1>
        <p className="pagehead__sub">
          Follow anywhere you like — that costs nothing. Speaking as a local is the part that asks
          for a real tie.
        </p>
      </header>

      <PlacesManager
        places={places.map((place) => ({
          geoScopeId: place.geoScopeId,
          name: place.name,
          countryCode: place.countryCode,
          kind: place.kind,
          canPublishLocally: place.canPublishLocally,
        }))}
      />

      <InvitePanel
        places={places.map((place) => ({ geoScopeId: place.geoScopeId, name: place.name }))}
      />
    </>
  );
}
