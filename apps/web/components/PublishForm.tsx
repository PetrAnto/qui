'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '../lib/client';
import { artworkFor } from '../lib/art';

const MOTIFS = [
  'sea',
  'workshop',
  'street',
  'stage',
  'garden',
  'court',
  'trail',
  'studio',
  'market',
  'wave',
] as const;

interface PlaceOption {
  readonly geoScopeId: string;
  readonly name: string;
  readonly canPublishLocally: boolean;
}

/**
 * Publishing.
 *
 * There is no file picker, because this build has no upload path (ADR-0007) and
 * a disabled one would be a lie. Instead the artwork is generated from a seed
 * and a motif you choose, the preview is exactly what other people will see,
 * and every card carries a "generated" chip.
 */
export function PublishForm({ places }: { places: readonly PlaceOption[] }) {
  const router = useRouter();
  const [geoScopeId, setGeoScopeId] = useState(
    places.find((place) => place.canPublishLocally)?.geoScopeId ?? places[0]?.geoScopeId ?? '',
  );
  const [caption, setCaption] = useState('');
  const [practice, setPractice] = useState('');
  const [motif, setMotif] = useState<string>('sea');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chosen = places.find((place) => place.geoScopeId === geoScopeId);
  const preview = artworkFor(caption.slice(0, 24) || 'preview', motif);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await api.post('/api/posts', { geoScopeId, caption, practice, motif });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <section className="stack">
      <header className="pagehead">
        <h1>Post something you did</h1>
        <p className="pagehead__sub">
          A morning, a repair, a session. Not a take — a thing that happened.
        </p>
      </header>

      <div className="card">
        <div className="art" style={{ background: preview.background }} role="img" aria-label="Preview of the generated artwork">
          <span className="chip chip--demo art__label">generated</span>
        </div>
      </div>

      <div className="segmented">
        {MOTIFS.map((value) => (
          <button
            key={value}
            type="button"
            className={value === motif ? 'btn btn--small btn--primary' : 'btn btn--small'}
            onClick={() => setMotif(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <label className="field">
        <span>City</span>
        <select
          className="select"
          value={geoScopeId}
          onChange={(event) => setGeoScopeId(event.target.value)}
        >
          {places.map((place) => (
            <option key={place.geoScopeId} value={place.geoScopeId}>
              {place.name}
              {place.canPublishLocally ? '' : ' — no local tie yet'}
            </option>
          ))}
        </select>
      </label>

      {chosen !== undefined && !chosen.canPublishLocally ? (
        <p className="notice notice--warn">
          You can read and answer things in {chosen.name}, but publishing there as a local needs a
          real tie first. Add one on the Places tab, or get two people who know you to vouch.
        </p>
      ) : null}

      <label className="field">
        <span>What happened</span>
        <textarea
          className="textarea"
          value={caption}
          maxLength={400}
          onChange={(event) => setCaption(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Practice (optional)</span>
        <input className="input" value={practice} onChange={(event) => setPractice(event.target.value)} />
      </label>

      {error !== null ? <p className="notice notice--warn">{error}</p> : null}

      <button
        type="button"
        className="btn btn--primary btn--block"
        disabled={busy || caption.trim().length === 0}
        onClick={() => void submit()}
      >
        {busy ? 'Posting…' : 'Post it'}
      </button>
    </section>
  );
}
