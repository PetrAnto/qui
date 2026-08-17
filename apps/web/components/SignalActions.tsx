'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '../lib/client';

/**
 * The two ways to act on somebody else's signal.
 *
 * Responding to an Ask or an Offer sends a message that the host must accept
 * before any private thread exists (INV-DM-1). Joining a Join or an Event puts
 * you in a hosted group instead, which is why those can legitimately mix age
 * bands and a private thread cannot.
 */
export function SignalActions({
  signalId,
  opensPrivateThread,
  alreadyResponded,
  alreadyJoined,
  verb,
}: {
  signalId: string;
  opensPrivateThread: boolean;
  alreadyResponded: boolean;
  alreadyJoined: boolean;
  verb: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function respond(): Promise<void> {
    setBusy(true);
    const result = await api.post(`/api/signals/${signalId}/respond`, { message });
    setBusy(false);
    setStatus(
      result.ok
        ? 'Sent. They decide whether this becomes a conversation — nothing opens until they say yes.'
        : result.message,
    );
    if (result.ok) setMessage('');
    router.refresh();
  }

  async function join(): Promise<void> {
    setBusy(true);
    const result = await api.post(`/api/signals/${signalId}/join`);
    setBusy(false);
    setStatus(result.ok ? 'You are in. The host can see you on the list.' : result.message);
    router.refresh();
  }

  async function happened(): Promise<void> {
    setBusy(true);
    const result = await api.put(`/api/signals/${signalId}/join`);
    setBusy(false);
    setStatus(result.ok ? 'Noted. That is the only number here that really counts.' : result.message);
  }

  if (opensPrivateThread) {
    return (
      <div className="card card--pad stack stack--tight">
        <label className="field">
          <span>{alreadyResponded ? 'Send another note' : verb}</span>
          <textarea
            className="textarea"
            value={message}
            maxLength={2000}
            placeholder="Say what you can bring to it."
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy || message.trim().length === 0}
          onClick={() => void respond()}
        >
          Send
        </button>
        {status !== null ? <p className="notice">{status}</p> : null}
      </div>
    );
  }

  return (
    <div className="card card--pad stack stack--tight">
      <button
        type="button"
        className="btn btn--primary btn--block"
        disabled={busy || alreadyJoined}
        onClick={() => void join()}
      >
        {alreadyJoined ? 'You are on the list' : verb}
      </button>
      {alreadyJoined ? (
        <button type="button" className="btn btn--block" disabled={busy} onClick={() => void happened()}>
          It actually happened
        </button>
      ) : null}
      {status !== null ? <p className="notice">{status}</p> : null}
    </div>
  );
}
