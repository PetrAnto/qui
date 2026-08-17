import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getDiscoverFeed } from '@indenoi/core';

import { CityBar } from '../components/CityBar';
import { PostCard } from '../components/PostCard';
import { TrackView } from '../components/TrackView';
import { resolveActiveCity } from '../lib/city';
import { currentUserId } from '../lib/session';
import { ports } from '../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Discover.
 *
 * One city at a time, ranked by a deterministic scorer that can explain every
 * term it used. Nothing on this page scores a person: the only inputs are how
 * fresh a piece of content is, whether it is from a place this viewer is
 * attached to, whether it touches something they said they care about, and how
 * it landed locally.
 */
export default async function DiscoverPage() {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const store = ports();
  const city = await resolveActiveCity(store, viewerId);
  const feed = await getDiscoverFeed(store, { viewerId, activeGeoScopeId: city.id });
  const now = store.now();

  return (
    <>
      <TrackView name="discover_impression" geoScopeId={city.id} />
      <CityBar cityName={city.name} cityId={city.id} />

      <header className="pagehead">
        <h1>What people here actually do</h1>
        <p className="pagehead__sub">
          Not opinions about the news. Somebody&apos;s morning, their workshop, their Tuesday
          session — and a way to be part of it.
        </p>
      </header>

      <div className="row row--wrap">
        <Link className="btn btn--small btn--primary" href="/publish">
          Post something
        </Link>
        <Link className="btn btn--small" href="/signals/new">
          Ask, offer or host
        </Link>
        <Link className="btn btn--small" href="/people">
          People in {city.name}
        </Link>
      </div>

      {feed === null || feed.cards.length === 0 ? (
        <p className="empty">
          Nothing in {city.name} yet. Post the first thing, or switch to a city where something is
          already happening.
        </p>
      ) : (
        <div className="stack">
          {feed.cards.map((card) => (
            <PostCard
              key={card.post.id}
              post={card.post}
              actions={card.actions}
              breakdown={card.breakdown}
              now={now}
            />
          ))}
        </div>
      )}
    </>
  );
}
