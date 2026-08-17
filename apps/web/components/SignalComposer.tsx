'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { SIGNAL_TYPES, type SignalType } from '@indenoi/core';

import { api } from '../lib/client';
import { SIGNAL_LABELS } from '../lib/format';

interface PlaceOption {
  readonly geoScopeId: string;
  readonly name: string;
  readonly canPublishLocally: boolean;
}

const HELP: Readonly<Record<SignalType, string>> = {
  ask: 'You need something. Somebody nearby probably has it.',
  offer: 'You have something to give — time, a skill, a tool, a spare seat.',
  join: 'Something you do that has room for one or two more.',
  event: 'A thing happening at a time and a place, that people can turn up to.',
};

/**
 * Composing a signal.
 *
 * Hosting (Join, Event) asks for a real tie to the place, because it puts
 * strangers in a room together and gives the host power over who stays. Asking
 * and offering only need the place to be one of yours. The form says which is
 * which before you type, rather than refusing you afterwards.
 */
export function SignalComposer({
  places,
  defaults,
}: {
  places: readonly PlaceOption[];
  defaults: { type: SignalType; city: string | null; practice: string | null; postId: string | null };
}) {
  const router = useRouter();
  const [type, setType] = useState<SignalType>(defaults.type);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [practice, setPractice] = useState(defaults.practice ?? '');
  const [placeLabel, setPlaceLabel] = useState('');
  const [capacity, setCapacity] = useState('');
  const [geoScopeId, setGeoScopeId] = useState(
    defaults.city ?? places[0]?.geoScopeId ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hosting = type === 'join' || type === 'event';
  const chosen = places.find((place) => place.geoScopeId === geoScopeId);
  const capacityNumber = Number.parseInt(capacity, 10);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await api.post<{ signalId: string }>('/api/signals', {
      type,
      title,
      body,
      geoScopeId,
      practice: practice.trim().length > 0 ? practice.trim() : null,
      placeLabel: placeLabel.trim().length > 0 ? placeLabel.trim() : null,
      capacity: Number.isFinite(capacityNumber) && capacityNumber > 0 ? capacityNumber : null,
      linkedPostId: defaults.postId,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/signals/${result.value.signalId}`);
    router.refresh();
  }

  return (
    <section className="stack">
      <header className="pagehead">
        <h1>Say something out loud</h1>
        <p className="pagehead__sub">{HELP[type]}</p>
      </header>

      <div className="segmented">
        {SIGNAL_TYPES.map((value) => (
          <button
            key={value}
            type="button"
            className={value === type ? 'btn btn--small btn--primary' : 'btn btn--small'}
            onClick={() => setType(value)}
          >
            {SIGNAL_LABELS[value]}
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

      {hosting && chosen !== undefined && !chosen.canPublishLocally ? (
        <p className="notice notice--warn">
          Hosting in {chosen.name} needs a real tie to the place — living there, working there, or two
          people who already know you vouching for you. Ask and Offer still work.
        </p>
      ) : null}

      <label className="field">
        <span>In one line</span>
        <input
          className="input"
          value={title}
          maxLength={120}
          placeholder={type === 'ask' ? 'Where can I get stickers printed?' : 'Free bike repairs Sunday'}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="field">
        <span>The detail</span>
        <textarea
          className="textarea"
          value={body}
          maxLength={400}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Practice (optional)</span>
        <input
          className="input"
          value={practice}
          onChange={(event) => setPractice(event.target.value)}
        />
      </label>

      {hosting ? (
        <>
          <label className="field">
            <span>Where you will meet</span>
            <input
              className="input"
              value={placeLabel}
              placeholder="Back room, the pub with the green door"
              onChange={(event) => setPlaceLabel(event.target.value)}
            />
            <span className="faint">
              A meeting point, never your address. Nothing here is turned into a coordinate.
            </span>
          </label>
          <label className="field">
            <span>How many people can come (optional)</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>
        </>
      ) : null}

      {error !== null ? <p className="notice notice--warn">{error}</p> : null}

      <button
        type="button"
        className="btn btn--primary btn--block"
        disabled={busy || title.trim().length === 0 || geoScopeId.length === 0}
        onClick={() => void submit()}
      >
        {busy ? 'Posting…' : 'Post it'}
      </button>
    </section>
  );
}
