'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { PublicAuthor } from '@indenoi/core';

import { api } from '../lib/client';

interface HostResponse {
  readonly id: string;
  readonly responder: PublicAuthor;
  readonly message: string;
  readonly state: string;
}

/**
 * Host controls.
 *
 * A host decides who is in *their* gathering, and nothing else. Excluding
 * somebody is permanent for this object and invisible everywhere else: it does
 * not follow them to another host's event, it does not restrict their account,
 * and it is not moderation (ADR-0010). The wording here says so, because a host
 * who thinks they are a moderator will behave like one.
 */
export function HostControls({
  signalId,
  responses,
  participants,
  canClose,
}: {
  signalId: string;
  responses: readonly HostResponse[];
  participants: readonly PublicAuthor[];
  canClose: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(payload: Record<string, unknown>, done: string): Promise<void> {
    setBusy(true);
    const result = await api.post(`/api/signals/${signalId}/host`, payload);
    setBusy(false);
    setStatus(result.ok ? done : result.message);
    router.refresh();
  }

  const pending = responses.filter((response) => response.state === 'pending');

  return (
    <section className="card card--pad stack stack--tight">
      <h2>You are hosting this</h2>
      <p className="faint">
        These powers cover this one gathering. They are not moderation and they do not follow anybody
        anywhere else.
      </p>

      {pending.length === 0 ? (
        <p className="muted">No one waiting on you.</p>
      ) : (
        pending.map((response) => (
          <div key={response.id} className="notice stack stack--tight">
            <strong>{response.responder.displayName}</strong>
            <p>{response.message}</p>
            <div className="row">
              <button
                type="button"
                className="btn btn--small btn--primary"
                disabled={busy}
                onClick={() =>
                  void act({ action: 'accept', responseId: response.id }, 'Accepted.')
                }
              >
                Accept
              </button>
              <button
                type="button"
                className="btn btn--small"
                disabled={busy}
                onClick={() =>
                  void act({ action: 'decline', responseId: response.id }, 'Declined.')
                }
              >
                Not this time
              </button>
            </div>
          </div>
        ))
      )}

      {participants.length > 0 ? (
        <div className="stack stack--tight">
          <h2>Who is coming</h2>
          {participants.map((person) => (
            <div key={person.id} className="row">
              <span>{person.displayName}</span>
              <button
                type="button"
                className="btn btn--small spacer"
                disabled={busy}
                onClick={() =>
                  void act({ action: 'remove', userId: person.id }, 'Removed from this one.')
                }
              >
                Remove
              </button>
              <button
                type="button"
                className="btn btn--small btn--danger"
                disabled={busy}
                onClick={() =>
                  void act(
                    { action: 'exclude', userId: person.id, reason: 'host decision' },
                    'Excluded. They cannot come back to this gathering.',
                  )
                }
              >
                Exclude
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {canClose ? (
        <button
          type="button"
          className="btn btn--block"
          disabled={busy}
          onClick={() => void act({ action: 'close' }, 'Closed to new people.')}
        >
          Close it to new people
        </button>
      ) : null}

      {status !== null ? <p className="notice">{status}</p> : null}
    </section>
  );
}
