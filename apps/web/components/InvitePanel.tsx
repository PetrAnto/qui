'use client';

import { useState } from 'react';

import { api } from '../lib/client';

/**
 * Invitations.
 *
 * A city gets interesting when the people already in it bring the people they
 * already know. An invite carries a place, not a permission: accepting one
 * attaches nothing on its own, it just tells us which cluster is growing and
 * from whom.
 */
export function InvitePanel({
  places,
}: {
  places: readonly { readonly geoScopeId: string; readonly name: string }[];
}) {
  const [geoScopeId, setGeoScopeId] = useState(places[0]?.geoScopeId ?? '');
  const [code, setCode] = useState<string | null>(null);
  const [entered, setEntered] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(): Promise<void> {
    setBusy(true);
    const result = await api.post<{ code: string }>('/api/invites', { geoScopeId });
    setBusy(false);
    if (result.ok) {
      setCode(result.value.code);
      setStatus(null);
    } else {
      setStatus(result.message);
    }
  }

  async function accept(): Promise<void> {
    setBusy(true);
    const result = await api.put('/api/invites', { code: entered.trim().toUpperCase() });
    setBusy(false);
    setStatus(result.ok ? 'Accepted. Welcome in.' : result.message);
    if (result.ok) setEntered('');
  }

  return (
    <section className="card card--pad stack stack--tight">
      <h2>Bring somebody</h2>
      {places.length === 0 ? (
        <p className="faint">Add a place first, then you can invite people into it.</p>
      ) : (
        <>
          <label className="field">
            <span>Into which city</span>
            <select
              className="select"
              value={geoScopeId}
              onChange={(event) => setGeoScopeId(event.target.value)}
            >
              {places.map((place) => (
                <option key={place.geoScopeId} value={place.geoScopeId}>
                  {place.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn--block" disabled={busy} onClick={() => void create()}>
            Make an invite code
          </button>
          {code !== null ? (
            <p className="notice">
              Share this code: <strong>{code}</strong>
            </p>
          ) : null}
        </>
      )}

      <label className="field">
        <span>Got a code?</span>
        <input
          className="input"
          value={entered}
          placeholder="DEMOAJACCIO1"
          onChange={(event) => setEntered(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="btn btn--block"
        disabled={busy || entered.trim().length === 0}
        onClick={() => void accept()}
      >
        Use it
      </button>
      {status !== null ? <p className="notice">{status}</p> : null}
    </section>
  );
}
