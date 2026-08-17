'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { PublicAuthor } from '@indenoi/core';

import { api } from '../lib/client';

/**
 * Blocked accounts, and the way back.
 *
 * The list is only the edges this person created. There is no "who blocked me"
 * anywhere in this product, because that would undo the whole point of a block.
 */
export function BlockList({ blocked }: { blocked: readonly PublicAuthor[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function unblock(targetId: string): Promise<void> {
    setBusy(true);
    const result = await api.del('/api/blocks', { targetId });
    setBusy(false);
    setStatus(result.ok ? 'Unblocked. You can see each other again.' : result.message);
    router.refresh();
  }

  return (
    <section className="card card--pad stack stack--tight">
      <h2>Blocked</h2>
      {blocked.length === 0 ? (
        <p className="faint">Nobody. A block hides you from each other in both directions.</p>
      ) : (
        blocked.map((person) => (
          <div key={person.id} className="row">
            <span>{person.displayName}</span>
            <button
              type="button"
              className="btn btn--small spacer"
              disabled={busy}
              onClick={() => void unblock(person.id)}
            >
              Unblock
            </button>
          </div>
        ))
      )}
      {status !== null ? <p className="notice">{status}</p> : null}
    </section>
  );
}
