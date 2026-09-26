import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSignalDetail } from '@indenoi/core';

import { Avatar } from '../../../components/Avatar';
import { HostControls } from '../../../components/HostControls';
import { SafetyMenu } from '../../../components/SafetyMenu';
import { SignalActions } from '../../../components/SignalActions';
import { formatInterval } from '@indenoi/core';

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
        {signal.hostless ? <span className="chip chip--context">Proposal · no host yet</span> : null}
        <span className="chip chip--demo">demo</span>
      </div>

      <header className="pagehead">
        <h1>{signal.title}</h1>
        <p className="pagehead__sub">
          {signal.cityName} · {relativeTime(signal.createdAt, now)}
        </p>
      </header>

      {signal.body.length > 0 ? <p>{signal.body}</p> : null}

      {signal.plan !== null ? (
        <section className="card card--pad stack stack--tight" aria-labelledby="plan-title">
          <h2 id="plan-title">Possible times</h2>
          <p className="faint">
            Candidate windows, local to {signal.cityName} — not appointments. About{' '}
            {signal.plan.durationMinutes} min.
          </p>
          <ul className="reasons">
            {signal.plan.windows.map((window) => (
              <li key={window.start}>
                {formatInterval(window, signal.plan?.timezone ?? 'UTC')}
                {window.preferred ? ' ★ preferred' : ''}
              </li>
            ))}
          </ul>
          {signal.plan.level !== null && signal.plan.level.value !== 'any' ? (
            <p className="muted">
              Level: {signal.plan.level.value} — {signal.plan.level.mandatory ? 'required' : 'preferred'}
            </p>
          ) : null}
          {signal.plan.freeOnly !== null ? (
            <p className="muted">
              Free to take part — {signal.plan.freeOnly.mandatory ? 'required' : 'preferred'}
            </p>
          ) : null}
          <p className="faint">Equipment: not specified. Cost: not specified.</p>
        </section>
      ) : null}

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

      {signal.hostless && signal.creator.id === viewerId ? (
        <p className="notice">
          Your proposal. It has no host yet: nobody can join or answer it, and proposing it gave you
          no host role.
        </p>
      ) : detail.isHost ? (
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
        personId={detail.isHost || signal.creator.id === viewerId ? undefined : signal.creator.id}
        personName={signal.creator.displayName}
      />
    </>
  );
}
