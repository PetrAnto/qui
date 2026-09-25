import { getScope } from '@indenoi/geo';

import { ActivitySearch } from '../../components/ActivitySearch';
import { resolveActiveCity } from '../../lib/city';
import { currentUserId } from '../../lib/session';
import { ports } from '../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Activity search.
 *
 * The one app screen that renders without a session, because the form holds
 * no data from anybody else: it is the person's own draft, kept in their tab.
 * Results are fetched only with a session, through the same visibility as the
 * Signals list. The demo clock (`store.now()`) is passed down so that the day
 * picker offers the days the synthetic city actually lives in.
 */
export default async function SearchPage() {
  const viewerId = await currentUserId();
  const store = ports();
  const city = viewerId === null ? null : await resolveActiveCity(store, viewerId);
  const timezone = city === null ? null : (getScope(city.id)?.timezone ?? city.timezone);

  return (
    <ActivitySearch
      signedIn={viewerId !== null}
      now={store.now()}
      defaultCity={city !== null && timezone !== null ? { id: city.id, name: city.name, timezone } : null}
    />
  );
}
