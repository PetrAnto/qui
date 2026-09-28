'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '../lib/client';

/**
 * The two explicit acts that give a proposal a host (ADR-0016, INV-HOST-3).
 * A volunteer offers; the proposer confirms one volunteer. The server checks
 * everything again at confirmation — this component only asks.
 */
export function VolunteerToHost({ signalId }: { signalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function offer(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await api.post(`/api/signals/${signalId}/host-offers`);
      if (result.ok) router.refresh();
      else setError(result.message);
    } catch {
      setError('That did not go through. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card--pad stack stack--tight">
      <p className="faint">
        Hosting means being responsible for this gathering: you would hold the host controls. The
        proposer decides whether to confirm you, and nobody joins automatically.
      </p>
      {error !== null ? <p className="notice notice--warn">{error}</p> : null}
      <button type="button" className="btn btn--primary btn--block" disabled={busy} onClick={() => void offer()}>
        Offer to host
      </button>
    </div>
  );
}

export function ConfirmHost({
  signalId,
  offers,
}: {
  signalId: string;
  offers: readonly { readonly volunteer: { readonly id: string; readonly displayName: string } }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm(volunteerId: string): Promise<void> {
    setBusy(volunteerId);
    setError(null);
    try {
      const result = await api.put(`/api/signals/${signalId}/host-offers`, { volunteerId });
      if (result.ok) router.refresh();
      else setError(result.message);
    } catch {
      setError('That did not go through. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  if (offers.length === 0) {
    return <p className="faint">Nobody has offered to host yet.</p>;
  }
  return (
    <section className="card card--pad stack stack--tight" aria-labelledby="host-offers-title">
      <h2 id="host-offers-title">Offers to host</h2>
      <p className="faint">
        Confirming gives that person the host controls for this activity. You stay its proposer; it keeps
        its possible times, and nobody joins automatically.
      </p>
      {error !== null ? <p className="notice notice--warn">{error}</p> : null}
      {offers.map(({ volunteer }) => (
        <div key={volunteer.id} className="row row--wrap">
          <span>{volunteer.displayName} offered to host</span>
          <button
            type="button"
            className="btn btn--small btn--primary spacer"
            disabled={busy !== null}
            onClick={() => void confirm(volunteer.id)}
          >
            Confirm {volunteer.displayName} as host
          </button>
        </div>
      ))}
    </section>
  );
}
