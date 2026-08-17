import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSignalDetail } from '@indenoi/core';

import { Avatar } from '../../../components/Avatar';
import { HostControls } from '../../../components/HostControls';
import { SafetyMenu } from '../../../components/SafetyMenu';
import { SignalActions } from '../../../components/SignalActions';
import { SIGNAL_LABELS, SIGNAL_VERBS, explain, relativeTime, untilTime } from '../../../lib/format';
import { currentUserId } from '../../../lib/session';
import { ports } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export default async function SignalPage({ params }: { params: Promise<{ id: string }> }) {
  const viewerId = await currentUserId();
  if (viewerId === null) redirect('/welcome');

  const { id } = await params;
  const store = ports();
  const detail = await getSignalDetail(store, { viewerId, signalId: id });
  if (detail === null) notFound();

  const now = store.now();
  const { signal } = detail;

  return (
    <>
      <div className="row row--wrap">
        <span className="chip chip--accent">{SIGNAL_LABELS[signal.type]}</span>
        {signal.practice !== null ? <span className="chip">{signal.practice}</span> : null}
        <span className="chip chip--demo">demo</span>
      </div>

      <header className="pagehead">
        <h1>{signal.title}</h1>
        <p className="pagehead__sub">
          {signal.cityName} · {relativeTime(signal.createdAt, now)}
        </p>
      </header>

      <p>{signal.body}</p>

      <div className="row row--wrap faint">
        {signal.placeLabel !== null ? <span className="chip">⌖ {signal.placeLabel}</span> : null}
        {signal.startsAt !== null ? (
          <span className="chip">{untilTime(signal.startsAt, now)}</span>
        ) : null}
        {signal.capacity !== null ? (
          <span className="chip">
            {signal.joinedCount}/{signal.capacity} in
          </span>
        ) : null}
        <span className="chip">{signal.state}</span>
      </div>

      <Link className="card card--pad row" href={`/p/${signal.creator.handle}`}>
        <Avatar media={signal.creator.avatar} displayName={signal.creator.displayName} />
        <div>
          <div style={{ fontWeight: 650 }}>{signal.creator.displayName}</div>
          <div className="faint">@{signal.creator.handle}</div>
        </div>
      </Link>

      {detail.isHost ? (
        <HostControls
          signalId={signal.id}
          responses={detail.responses}
          participants={detail.participants}
          canClose={detail.hostPowers.includes('close_participation')}
        />
      ) : detail.eligibility.allowed ? (
        <SignalActions
          signalId={signal.id}
          opensPrivateThread={detail.opensPrivateThread}
          alreadyResponded={detail.viewerResponded}
          alreadyJoined={detail.viewerJoined}
          verb={SIGNAL_VERBS[signal.type]}
        />
      ) : (
        <p className="notice notice--warn">{explain(detail.eligibility.reason)}</p>
      )}

      {detail.participants.length > 0 && !detail.isHost ? (
        <section className="card card--pad stack stack--tight">
          <h2>Who is coming</h2>
          <div className="row row--wrap">
            {detail.participants.map((person) => (
              <Link key={person.id} className="chip" href={`/p/${person.handle}`}>
                {person.displayName}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <SafetyMenu
        targetType="signal"
        targetId={signal.id}
        personId={detail.isHost ? undefined : signal.creator.id}
        personName={signal.creator.displayName}
      />
    </>
  );
}
