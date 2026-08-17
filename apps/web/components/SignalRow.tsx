import Link from 'next/link';

import type { Decision, PublicSignal } from '@indenoi/core';

import { Avatar } from './Avatar';
import { SIGNAL_LABELS, explain, relativeTime, untilTime } from '../lib/format';

/**
 * A signal in a list.
 *
 * The eligibility decision travels with it, so a control that would be refused
 * is shown disabled *with the reason*, rather than silently missing. Hiding a
 * refusal teaches people to hunt for the loophole; explaining it does not.
 */
export function SignalRow({
  signal,
  eligibility,
  isHost,
  now,
}: {
  signal: PublicSignal;
  eligibility: Decision;
  isHost: boolean;
  now: string;
}) {
  return (
    <article className="card card--pad stack stack--tight">
      <div className="row row--wrap">
        <span className="chip chip--accent">{SIGNAL_LABELS[signal.type]}</span>
        {signal.practice !== null ? <span className="chip">{signal.practice}</span> : null}
        <span className="faint spacer">{relativeTime(signal.createdAt, now)}</span>
      </div>

      <Link href={`/signals/${signal.id}`}>
        <h2>{signal.title}</h2>
      </Link>
      <p className="muted">{signal.body}</p>

      <div className="row row--wrap faint">
        <Avatar media={signal.creator.avatar} displayName={signal.creator.displayName} />
        <span>
          {signal.creator.displayName} · {signal.cityName}
        </span>
      </div>

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
      </div>

      {isHost ? (
        <Link className="btn btn--small" href={`/signals/${signal.id}`}>
          You are hosting this — manage
        </Link>
      ) : eligibility.allowed ? (
        <Link className="btn btn--small btn--primary" href={`/signals/${signal.id}`}>
          Open
        </Link>
      ) : (
        <p className="notice">{explain(eligibility.reason)}</p>
      )}
    </article>
  );
}
