import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getMyPlaces, listBlockedBy } from '@indenoi/core';

import { Avatar } from '../../components/Avatar';
import { BlockList } from '../../components/BlockList';
import { PersonaSwitcher } from '../../components/PersonaSwitcher';
import { FEATURES, IS_DEMO_BUILD } from '../../lib/features';
import { currentUserId } from '../../lib/session';
import { ports } from '../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * Me — profile, trust, cities and account state (canon 04 §1.1).
 *
 * The canonical Me organizes around Account, Privacy, Verification, Cities &
 * local access, Connected accounts, Notifications, Safety, Appearance and
 * About. This build implements only the modules that honestly exist — cities
 * & local access, safety/blocked accounts, about — and keeps demo diagnostics
 * visibly separate at the bottom. Notifications, appearance settings,
 * connected accounts and verification management are not fake-rendered here;
 * they land when the capability behind them does.
 */
export default async function MePage() {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const store = ports();
  const me = await store.repo.getPerson(viewerId);
  if (me === null) redirect('/welcome');

  const [places, blocked, people] = await Promise.all([
    getMyPlaces(store, viewerId),
    listBlockedBy(store, viewerId),
    store.repo.listPeople(),
  ]);

  return (
    <>
      <div className="row">
        <Avatar media={me.avatar} displayName={me.displayName} large />
        <div>
          <h1>{me.displayName}</h1>
          <p className="faint">@{me.handle}</p>
        </div>
      </div>

      <div className="row row--wrap">
        <Link className="btn btn--small" href={`/p/${me.handle}`}>
          View your profile
        </Link>
      </div>

      <section className="card card--pad stack stack--tight">
        <h2>Cities &amp; local access</h2>
        <p className="muted">
          Your ties to places decide where you can publish as a local. Exploring anywhere else is
          always free.
        </p>
        <Link className="btn btn--small" href="/places">
          Your places ({places.length})
        </Link>
      </section>

      <section className="stack stack--tight">
        <h2>Safety</h2>
        <BlockList blocked={blocked} />
      </section>

      <section className="card card--pad stack stack--tight">
        <h2>About QUI</h2>
        <p className="muted">What is real in this product, and what is deliberately not built.</p>
        <Link className="btn btn--small" href="/about">
          What is real here
        </Link>
      </section>

      <section className="card card--pad stack stack--tight">
        <h2>About this build</h2>
        <ul className="muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>Sign-in: {FEATURES.productionAuth ? 'on' : 'off — demo personas only'}</li>
          <li>
            Identity verification:{' '}
            {FEATURES.liveIdentityVerification ? 'live provider' : 'off — no provider contract yet'}
          </li>
          <li>
            Photo and video upload:{' '}
            {FEATURES.mediaUploads ? 'on' : 'off — artwork is generated from a seed'}
          </li>
          <li>
            Database:{' '}
            {FEATURES.persistentDatabase
              ? 'D1'
              : 'off — state lives in this process and is lost on restart'}
          </li>
        </ul>
        {IS_DEMO_BUILD ? (
          <p className="faint">
            Every one of these is a flag with a safe default. None of them is half-implemented.
          </p>
        ) : null}
        <Link className="btn btn--small btn--ghost" href="/insights">
          Internal insights (demo diagnostics)
        </Link>
      </section>

      {IS_DEMO_BUILD ? (
        <PersonaSwitcher
          personas={people.map((person) => ({
            id: person.id,
            displayName: person.displayName,
            handle: person.handle,
          }))}
          currentId={viewerId}
        />
      ) : null}
    </>
  );
}
