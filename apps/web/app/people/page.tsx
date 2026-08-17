import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getPeopleInCity } from '@indenoi/core';

import { Avatar } from '../../components/Avatar';
import { CityBar } from '../../components/CityBar';
import { TrustBadges } from '../../components/TrustBadges';
import { resolveActiveCity } from '../../lib/city';
import { currentUserId } from '../../lib/session';
import { ports } from '../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * People discovery.
 *
 * This is the one surface where an adult browses strangers, so minors are not
 * in it (INV-AGE-3). They are still reachable through what they publish in
 * their own city — a passive surface — but they are not in a catalogue of
 * people that anybody can page through.
 */
export default async function PeoplePage() {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const store = ports();
  const city = await resolveActiveCity(store, viewerId);
  const people = await getPeopleInCity(store, { viewerId, geoScopeId: city.id });

  return (
    <>
      <CityBar cityName={city.name} cityId={city.id} />

      <header className="pagehead">
        <h1>People in {city.name}</h1>
        <p className="pagehead__sub">
          What they do, what they can help with, what they want to learn. No follower counts and no
          score — a person is not a number here.
        </p>
      </header>

      {people === null || people.length === 0 ? (
        <p className="empty">Nobody listed in {city.name} yet.</p>
      ) : (
        <div className="stack">
          {people.map((person) => (
            <Link key={person.id} className="card card--pad stack stack--tight" href={`/p/${person.handle}`}>
              <div className="row">
                <Avatar media={person.avatar} displayName={person.displayName} />
                <div>
                  <div style={{ fontWeight: 650 }}>{person.displayName}</div>
                  <div className="faint">@{person.handle}</div>
                </div>
              </div>
              <p className="muted">{person.bio}</p>
              <div className="row row--wrap">
                {person.practices.map((practice) => (
                  <span key={practice} className="chip">
                    {practice}
                  </span>
                ))}
              </div>
              <TrustBadges trust={person.trust} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
