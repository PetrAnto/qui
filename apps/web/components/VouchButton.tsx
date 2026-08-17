'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '../lib/client';

/**
 * Vouching.
 *
 * Two independent vouches in a city stand in for an attested local presence, so
 * this is the one place where a community can let somebody in without a
 * document. It is deliberately narrow: a vouch says "I know this person here",
 * gives the voucher no power over them, and is not identity verification.
 */
export function VouchButton({
  subjectId,
  subjectName,
  places,
}: {
  subjectId: string;
  subjectName: string;
  places: readonly { readonly id: string; readonly name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [geoScopeId, setGeoScopeId] = useState(places[0]?.id ?? '');
  const [statement, setStatement] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (places.length === 0) return null;

  async function submit(): Promise<void> {
    setBusy(true);
    const result = await api.post('/api/vouches', { subjectId, geoScopeId, statement });
    setBusy(false);
    setStatus(result.ok ? 'Recorded. It counts as evidence, not as authority.' : result.message);
    if (result.ok) router.refresh();
  }

  return (
    <div className="stack stack--tight">
      <button
        type="button"
        className="btn btn--small btn--ghost"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Close' : `Vouch for ${subjectName}`}
      </button>

      {open ? (
        <div className="card card--pad stack stack--tight">
          <label className="field">
            <span>Where do you know them from?</span>
            <select
              className="select"
              value={geoScopeId}
              onChange={(event) => setGeoScopeId(event.target.value)}
            >
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>How, in one line</span>
            <input
              className="input"
              value={statement}
              maxLength={240}
              placeholder="She is in the workshop most Wednesdays."
              onChange={(event) => setStatement(event.target.value)}
            />
          </label>
          <button type="button" className="btn btn--block" disabled={busy} onClick={() => void submit()}>
            Vouch
          </button>
          <p className="faint">
            Two independent vouches let somebody publish as a local here. It is not proof of who they
            are, and it gives you nothing over them.
          </p>
          {status !== null ? <p className="notice">{status}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
