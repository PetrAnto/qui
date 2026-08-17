'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '../lib/client';

interface CityResult {
  readonly id: string;
  readonly name: string;
  readonly countryCode: string;
  readonly label: string;
}

/**
 * Switching city, from anywhere.
 *
 * Any city in the gazetteer, searched by name, accent-insensitively. Switching
 * needs no evidence and no permission — being somewhere is not a claim. The
 * "add to my places" step is separate and is what starts to matter for
 * publishing.
 */
export function CityBar({ cityName, cityId }: { cityName: string; cityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly CityResult[]>([]);
  const [error, setError] = useState<string | null>(null);
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
    else setError(result.message);
  }

  async function choose(id: string): Promise<void> {
    setBusy(true);
    const result = await api.post('/api/active-city', { geoScopeId: id });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    setQuery('');
    setResults([]);
    router.refresh();
  }

  return (
    <div className="stack stack--tight">
      <div className="citybar">
        <span className="chip chip--accent">Here</span>
        <span className="citybar__name">{cityName}</span>
        <button
          type="button"
          className="btn btn--small btn--ghost spacer"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Close' : 'Change city'}
        </button>
      </div>

      {open ? (
        <div className="card card--pad stack stack--tight">
          <label className="field">
            <span>Search any city</span>
            <input
              className="input"
              type="search"
              autoFocus
              value={query}
              placeholder="Any city on earth"
              onChange={(event) => void search(event.target.value)}
            />
          </label>
          {error !== null ? <p className="notice notice--warn">{error}</p> : null}
          <div className="searchresults">
            {results.map((city) => (
              <button
                key={city.id}
                type="button"
                className="result"
                disabled={busy || city.id === cityId}
                onClick={() => void choose(city.id)}
              >
                <span>{city.name}</span>
                <span className="faint spacer">{city.countryCode}</span>
              </button>
            ))}
            {query.trim().length > 0 && results.length === 0 ? (
              <p className="faint">Nothing by that name. Try another spelling.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
