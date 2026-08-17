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
        <Link className="btn btn--small" href="/places">
          Your places ({places.length})
        </Link>
        <Link className="btn btn--small" href="/insights">
          Internal insights
        </Link>
        <Link className="btn btn--small" href="/about">
          What is real here
        </Link>
      </div>

      <section className="card card--pad stack stack--tight">
        <h2>What this build can and cannot do</h2>
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
      </section>

      <BlockList blocked={blocked} />

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
