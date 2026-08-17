'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '../lib/client';

export function MessageComposer({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(): Promise<void> {
    setBusy(true);
    const result = await api.post(`/api/threads/${threadId}/messages`, { body });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setBody('');
    setError(null);
    router.refresh();
  }

  return (
    <div className="stack stack--tight">
      <label className="field">
        <span className="visually-hidden">Message</span>
        <textarea
          className="textarea"
          value={body}
          maxLength={2000}
          placeholder="Write something"
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      {error !== null ? <p className="notice notice--warn">{error}</p> : null}
      <button
        type="button"
        className="btn btn--primary btn--block"
        disabled={busy || body.trim().length === 0}
        onClick={() => void send()}
      >
        Send
      </button>
    </div>
  );
}
