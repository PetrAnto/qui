import { redirect } from 'next/navigation';

import { SIGNAL_TYPES, getMyPlaces, type SignalType } from '@indenoi/core';

import { SignalComposer } from '../../../components/SignalComposer';
import { isKnownCity, resolveActiveCity } from '../../../lib/city';
import { currentUserId } from '../../../lib/session';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export default async function NewSignalPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; city?: string; practice?: string; post?: string }>;
}) {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const params = await searchParams;
  const store = ports();
  const city = await resolveActiveCity(store, viewerId);
  const places = await getMyPlaces(store, viewerId);

  const mine = places.map((place) => ({
    geoScopeId: place.geoScopeId,
    name: place.name,
    canPublishLocally: place.canPublishLocally,
  }));
  // Somebody arriving from a Discover card has never added that city, so it is
  // offered here alongside their own places rather than silently dropped.
  const options = mine.some((place) => place.geoScopeId === city.id)
    ? mine
    : [{ geoScopeId: city.id, name: city.name, canPublishLocally: false }, ...mine];

  const requestedType = (SIGNAL_TYPES as readonly string[]).includes(params.type ?? '')
    ? (params.type as SignalType)
    : 'ask';

  return (
    <SignalComposer
      places={options}
      defaults={{
        type: requestedType,
        city: params.city !== undefined && isKnownCity(params.city) ? params.city : city.id,
        practice: params.practice ?? null,
        postId: params.post ?? null,
      }}
    />
  );
}
