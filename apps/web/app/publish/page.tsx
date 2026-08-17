import { redirect } from 'next/navigation';

import { getMyPlaces } from '@indenoi/core';

import { PublishForm } from '../../components/PublishForm';
import { resolveActiveCity } from '../../lib/city';
import { currentUserId } from '../../lib/session';
import { ports } from '../../lib/store';

export const dynamic = 'force-dynamic';

export default async function PublishPage() {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const store = ports();
  const [places, city] = await Promise.all([
    getMyPlaces(store, viewerId),
    resolveActiveCity(store, viewerId),
  ]);

  const mine = places.map((place) => ({
    geoScopeId: place.geoScopeId,
    name: place.name,
    canPublishLocally: place.canPublishLocally,
  }));
  const options = mine.some((place) => place.geoScopeId === city.id)
    ? mine
    : [{ geoScopeId: city.id, name: city.name, canPublishLocally: false }, ...mine];

  return <PublishForm places={options} />;
}
