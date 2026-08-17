'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { GeoAttachmentKind } from '@indenoi/core';

import { api } from '../lib/client';
import { ATTACHMENT_LABELS } from '../lib/format';
import { ONBOARDING_KINDS } from '../lib/kinds';

interface PlaceRow {
  readonly geoScopeId: string;
  readonly name: string;
  readonly countryCode: string;
  readonly kind: string;
  readonly canPublishLocally: boolean;
}

interface CityResult {
  readonly id: string;
  readonly name: string;
  readonly countryCode: string;
}

/**
 * Your places.
 *
 * Adding a city costs nothing and needs no evidence — exploring anywhere is a
 * right, and it is also the honest signal of where this product is spreading.
 * Publishing *as a local* is the part that asks for a real tie, and the list
 * says plainly which of your places currently qualifies and which does not.
 */
export function PlacesManager({ places }: { places: readonly PlaceRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly CityResult[]>([]);
  const [kind, setKind] = useState<GeoAttachmentKind>('exploring');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(value: string): Promise<void> {
    setQuery(value);
    if (value.trim().length === 0) {
      setResults([]);
      return;
    }
    const result = await api.get<{ cities: CityResult[] }>(
      `/api/cities?q=${encodeURIComponent(value)}`,
    );
    if (result.ok) setResults(result.value.cities);
  }

  async function add(geoScopeId: string): Promise<void> {
    setBusy(true);
    const result = await api.post('/api/cities', { geoScopeId, kind });
    setBusy(false);
    setStatus(result.ok ? 'Added.' : result.message);
    setQuery('');
    setResults([]);
    router.refresh();
  }

  async function remove(geoScopeId: string): Promise<void> {
    setBusy(true);
    const result = await api.del('/api/cities', { geoScopeId });
    setBusy(false);
    setStatus(result.ok ? 'Removed.' : result.message);
    router.refresh();
  }

  return (
    <div className="stack">
      <section className="stack stack--tight">
        {places.length === 0 ? (
          <p className="empty">No places yet. Add the one you are actually in.</p>
        ) : (
          places.map((place) => (
            <div key={place.geoScopeId} className="card card--pad stack stack--tight">
              <div className="row">
                <div>
                  <div style={{ fontWeight: 650 }}>{place.name}</div>
                  <div className="faint">
                    {ATTACHMENT_LABELS[place.kind as GeoAttachmentKind] ?? place.kind} ·{' '}
                    {place.countryCode}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--small btn--ghost spacer"
                  disabled={busy}
                  onClick={() => void remove(place.geoScopeId)}
                >
                  Remove
                </button>
              </div>
              {place.canPublishLocally ? (
                <span className="chip">You can publish here as a local</span>
              ) : (
                <p className="faint">
                  You can read and answer here. Publishing as a local needs a real tie — living or
                  working here, or two people who know you vouching for you.
                </p>
              )}
            </div>
          ))
        )}
      </section>

      <section className="card card--pad stack stack--tight">
        <h2>Add a city</h2>
        <label className="field">
          <span>What is it to you?</span>
          <select
            className="select"
            value={kind}
            onChange={(event) => setKind(event.target.value as GeoAttachmentKind)}
          >
            {ONBOARDING_KINDS.map((value) => (
              <option key={value} value={value}>
                {ATTACHMENT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Search</span>
          <input
            className="input"
            type="search"
            value={query}
            placeholder="Any city — Kilrush, Porto, Girona…"
            onChange={(event) => void search(event.target.value)}
          />
        </label>
        <div className="searchresults">
          {results.map((city) => (
            <button
              key={city.id}
              type="button"
              className="result"
              disabled={busy}
              onClick={() => void add(city.id)}
            >
              <span>{city.name}</span>
              <span className="faint spacer">{city.countryCode}</span>
            </button>
          ))}
        </div>
        {status !== null ? <p className="notice">{status}</p> : null}
      </section>
    </div>
  );
}
