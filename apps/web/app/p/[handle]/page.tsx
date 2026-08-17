import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getProfile } from '@indenoi/core';

import { Art } from '../../../components/Art';
import { Avatar } from '../../../components/Avatar';
import { SafetyMenu } from '../../../components/SafetyMenu';
import { TrackView } from '../../../components/TrackView';
import { TrustBadges } from '../../../components/TrustBadges';
import { VouchButton } from '../../../components/VouchButton';
import { ATTACHMENT_LABELS, explain, relativeTime } from '../../../lib/format';
import { currentUserId } from '../../../lib/session';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * A profile.
 *
 * Everything here is what the person chose to say plus what they have published.
 * There is no age, no account state, no attestation detail and no coordinate —
 * the projection in `@indenoi/core` cannot carry them (INV-PROFILE-1,
 * INV-GEO-1). A blocked or suspended account is a plain 404, indistinguishable
 * from one that never existed.
 */
export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const { handle } = await params;
  const store = ports();
  const view = await getProfile(store, { viewerId, handle });
  if (view === null) notFound();

  const now = store.now();
  const { profile } = view;
  const firstPlace = profile.places[0];

  return (
    <>
      <TrackView name="profile_open" geoScopeId={firstPlace?.geoScopeId ?? null} targetId={profile.id} />

      <div className="row">
        <Avatar media={profile.avatar} displayName={profile.displayName} large />
        <div>
          <h1>{profile.displayName}</h1>
          <p className="faint">@{profile.handle}</p>
        </div>
      </div>

      <p>{profile.bio}</p>

      <div className="row row--wrap">
        {profile.places.map((place) => (
          <span key={place.geoScopeId} className="chip">
            {place.name} · {ATTACHMENT_LABELS[place.kind as keyof typeof ATTACHMENT_LABELS] ?? place.kind}
          </span>
        ))}
      </div>

      <TrustBadges trust={profile.trust} />

      <section className="card card--pad stack stack--tight">
        <h2>What they do</h2>
        <div className="row row--wrap">
          {profile.practices.map((value) => (
            <span key={value} className="chip">
              {value}
            </span>
          ))}
        </div>
        {profile.canHelpWith.length > 0 ? (
          <p className="muted">Can help with: {profile.canHelpWith.join(', ')}</p>
        ) : null}
        {profile.wantsToLearn.length > 0 ? (
          <p className="muted">Wants to learn: {profile.wantsToLearn.join(', ')}</p>
        ) : null}
      </section>

      {view.isSelf ? null : (
        <section className="card card--pad stack stack--tight">
          <h2>Reaching {profile.displayName}</h2>
          {view.contact.allowed ? (
            <>
              <p className="muted">
                You can answer something they put up. That is the only door, and they chose to open
                it.
              </p>
              {view.signals.length > 0 ? (
                <Link className="btn btn--primary btn--block" href={`/signals/${view.signals[0]?.id}`}>
                  Answer their signal
                </Link>
              ) : null}
            </>
          ) : (
            <p className="notice">{explain(view.contact.reason)}</p>
          )}
        </section>
      )}

      {view.signals.length > 0 ? (
        <section className="stack stack--tight">
          <h2>Open right now</h2>
          {view.signals.map((signal) => (
            <Link key={signal.id} className="card card--pad" href={`/signals/${signal.id}`}>
              <strong>{signal.title}</strong>
              <p className="faint">
                {signal.cityName} · {relativeTime(signal.createdAt, now)}
              </p>
            </Link>
          ))}
        </section>
      ) : null}

      {view.posts.length > 0 ? (
        <section className="stack stack--tight">
          <h2>Recently</h2>
          {view.posts.map((post) => (
            <article key={post.id} className="card">
              <Art media={post.media} />
              <div className="postcard__body">
                <p>{post.caption}</p>
                <p className="faint">
                  {post.cityName} · {relativeTime(post.createdAt, now)} · ♥ {post.appreciations}
                </p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {view.isSelf ? null : (
        <>
          <VouchButton
            subjectId={profile.id}
            subjectName={profile.displayName}
            places={profile.places.map((place) => ({ id: place.geoScopeId, name: place.name }))}
          />
          <SafetyMenu
            targetType="user"
            targetId={profile.id}
            personId={profile.id}
            personName={profile.displayName}
          />
        </>
      )}
    </>
  );
}
