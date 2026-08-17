'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '../lib/client';

interface Persona {
  readonly id: string;
  readonly displayName: string;
  readonly handle: string;
}

/**
 * The demo persona switcher.
 *
 * This is the honest shape of "no authentication yet" (ADR-0005): rather than a
 * half-built login that nobody should trust, the build says out loud that it is
 * handing you a synthetic account, and lets you take any of them so that every
 * rule — the minor, the restricted account, the moderator, the two people who
 * blocked each other — can actually be seen working.
 *
 * It disappears the moment `productionAuth` is switched on.
 */
export function PersonaSwitcher({
  personas,
  currentId,
}: {
  personas: readonly Persona[];
  currentId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function become(userId: string): Promise<void> {
    setBusy(true);
    const result = await api.post('/api/session', { userId });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <section className="card card--pad stack stack--tight">
      <h2>Be somebody else</h2>
      <p className="faint">
        There is no sign-in in this build. Switching is how you check that a rule really applies —
        try the same screen as a minor, as a restricted account, or as one of the two people who
        blocked each other.
      </p>
      {error !== null ? <p className="notice notice--warn">{error}</p> : null}
      <div className="searchresults">
        {personas.map((persona) => (
          <button
            key={persona.id}
            type="button"
            className="result"
            disabled={busy || persona.id === currentId}
            onClick={() => void become(persona.id)}
          >
            <span>{persona.displayName}</span>
            <span className="faint spacer">@{persona.handle}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
