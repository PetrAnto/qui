'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import type { GeoAttachmentKind } from '@indenoi/core';

import { api } from '../lib/client';
import { ATTACHMENT_LABELS } from '../lib/format';
import { ONBOARDING_KINDS } from '../lib/kinds';
import { createSearchSequence } from '../lib/search-sequence';

interface CityOption {
  readonly id: string;
  readonly name: string;
  readonly countryCode: string;
}

interface CityResult extends CityOption {
  readonly label?: string;
}

const STEPS = ['age', 'place', 'doing', 'ready'] as const;
type Step = (typeof STEPS)[number];

function facetList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Onboarding.
 *
 * The age question is asked once, converted to a band by the server and then
 * forgotten. Nothing in this component keeps it, nothing sends it anywhere
 * else, and the answer that comes back does not contain it either.
 *
 * The place question is not a location permission. It asks what a place *is* to
 * you — where you live, where you work, where your family is from — because
 * that is the thing that decides whether you can publish there as a local, and
 * a GPS fix cannot tell us any of it.
 */
export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('age');
  const [age, setAge] = useState('');
  const [city, setCity] = useState<CityOption | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly CityResult[]>([]);
  const [kind, setKind] = useState<GeoAttachmentKind>('resident');
  const [practices, setPractices] = useState('');
  const [interests, setInterests] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const searchSeq = useRef(createSearchSequence());

  const ageNumber = Number.parseInt(age, 10);
  const ageLooksUsable = Number.isFinite(ageNumber) && ageNumber > 0 && ageNumber < 120;

  async function finish(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await api.post<{ userId: string }>('/api/onboarding', {
      age: ageNumber,
      geoScopeId: city?.id ?? '',
      kind,
      practices: facetList(practices),
      interests: facetList(interests),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      setStep('age');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <section className="stack">
      <div className="steps" aria-hidden="true">
        {STEPS.map((value) => (
          <span key={value} data-done={STEPS.indexOf(value) <= STEPS.indexOf(step)} />
        ))}
      </div>

      {step === 'age' ? (
        <div className="stack">
          <header className="pagehead">
            <h2>How old are you?</h2>
            <p className="pagehead__sub">
              Asked once. We keep whether you are 15–17 or 18+, and nothing else — not the number,
              not a birth date, not a document.
            </p>
          </header>
          <label className="field">
            <span>Your age</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={13}
              max={119}
              value={age}
              onChange={(event) => setAge(event.target.value)}
            />
          </label>
          {error !== null ? <p className="notice notice--warn">{error}</p> : null}
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={!ageLooksUsable}
            onClick={() => setStep('place')}
          >
            Continue
          </button>
          <p className="faint">
            The minimum age here is 15. Below that we do not create an account at all — see the age
            baseline note in the docs for why that number and not another.
          </p>
        </div>
      ) : null}

      {step === 'place' ? (
        <div className="stack">
          <header className="pagehead">
            <h2>Where are you?</h2>
            <p className="pagehead__sub">
              Search any city. No location permission, ever — this is a relationship, not a
              coordinate. Exploring is free; speaking as a local is the part that asks for a tie.
            </p>
          </header>
          <label className="field">
            <span>City</span>
            <input
              className="input"
              type="search"
              value={query}
              placeholder="Ajaccio, Kilrush, Tokyo…"
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                // Editing the text after choosing un-chooses it: what Continue
                // submits must always be what is visibly selected, not a city
                // the query used to name.
                setCity((current) => (current !== null && value !== current.name ? null : current));
                if (value.trim().length === 0) {
                  searchSeq.current.cancel();
                  setResults([]);
                  return;
                }
                const token = searchSeq.current.begin();
                void api
                  .get<{ cities: CityResult[] }>(`/api/cities?q=${encodeURIComponent(value)}`)
                  .then((result) => {
                    // A slow answer to an older query must not overwrite the
                    // results for the text that is actually on screen.
                    if (!searchSeq.current.isCurrent(token)) return;
                    if (result.ok) setResults(result.value.cities);
                  });
              }}
            />
          </label>
          {city !== null ? (
            <p className="muted">
              Selected: {city.name} · {city.countryCode}
            </p>
          ) : (
            <p className="faint">Type at least a few letters. Any city on earth is fair game.</p>
          )}
          <div className="searchresults">
            {results.map((hit) => (
              <button
                key={hit.id}
                type="button"
                className="result"
                onClick={() => {
                  // Choosing is the end of the search: a response still in
                  // flight must not reopen the list it came from.
                  searchSeq.current.cancel();
                  setCity(hit);
                  setQuery(`${hit.name}`);
                  setResults([]);
                }}
              >
                <span>{hit.name}</span>
                <span className="faint spacer">{hit.countryCode}</span>
              </button>
            ))}
          </div>
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
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={city === null}
            onClick={() => setStep('doing')}
          >
            Continue
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => setStep('age')}>
            Back
          </button>
        </div>
      ) : null}

      {step === 'doing' ? (
        <div className="stack">
          <header className="pagehead">
            <h2>What do you actually do?</h2>
            <p className="pagehead__sub">
              Things you practise, not things you have opinions about. This is what Discover uses to
              put the right people in front of you.
            </p>
          </header>
          <label className="field">
            <span>I practise… (comma separated)</span>
            <input
              className="input"
              value={practices}
              placeholder="freediving, film photography"
              onChange={(event) => setPractices(event.target.value)}
            />
          </label>
          <label className="field">
            <span>I would go to… (comma separated)</span>
            <input
              className="input"
              value={interests}
              placeholder="beach clean-ups, repair cafés"
              onChange={(event) => setInterests(event.target.value)}
            />
          </label>
          <button type="button" className="btn btn--primary btn--block" onClick={() => setStep('ready')}>
            Continue
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => setStep('place')}>
            Back
          </button>
        </div>
      ) : null}

      {step === 'ready' ? (
        <div className="stack">
          <header className="pagehead">
            <h2>One honest thing first</h2>
          </header>
          <p className="notice notice--warn">
            This build cannot create a real account. Sign-in is not implemented — it is a decision
            recorded in ADR-0005 and switched off behind a capability flag, not something half-built
            here. When you continue, the app hands you one of the invented residents whose age band
            matches what you told us, and everything you then do is real code against real rules.
          </p>
          <p className="muted">
            You can swap to any other demo person at any time from the You tab.
          </p>
          {error !== null ? <p className="notice notice--warn">{error}</p> : null}
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={busy}
            onClick={() => void finish()}
          >
            {busy ? 'Setting up…' : 'Take me in'}
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => setStep('doing')}>
            Back
          </button>
        </div>
      ) : null}
    </section>
  );
}
