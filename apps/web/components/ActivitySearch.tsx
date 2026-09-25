'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  DAY_PARTS,
  buildProposalPreview,
  slotsToAvailability,
  upcomingLocalDates,
  type ActivitySearchView,
  type DayPart,
  type DaySlot,
  type Level,
  type MatchReason,
  type ProposalPreview,
  type Verdict,
} from '@indenoi/core';

import {
  DURATIONS,
  EMPTY_DRAFT,
  loadDraft,
  rememberReturnTo,
  saveDraft,
  type ActivityDraft,
  type DraftCity,
} from '../lib/activity-draft';
import { api } from '../lib/client';
import { SIGNAL_LABELS, explain } from '../lib/format';
import { createSearchSequence } from '../lib/search-sequence';

interface CityResult {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly timezone: string | null;
}

const PART_LABELS: Readonly<Record<DayPart, string>> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

const VERDICT_LABELS: Readonly<Record<Exclude<Verdict, 'incompatible'>, string>> = {
  compatible: 'Fits your search',
  unconfirmed: 'Needs confirmation',
};

const OUTCOME_MARKS: Readonly<Record<MatchReason['outcome'], string>> = {
  met: '✓',
  unmet: '✗',
  unknown: '?',
  info: '·',
};

const OUTCOME_WORDS: Readonly<Record<MatchReason['outcome'], string>> = {
  met: 'met',
  unmet: 'not met',
  unknown: 'unknown',
  info: 'note',
};

function dayLabel(date: string): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

type SlotState = 'off' | 'available' | 'preferred';

function slotState(slots: readonly DaySlot[], date: string, part: DayPart): SlotState {
  const slot = slots.find((entry) => entry.date === date && entry.part === part);
  if (slot === undefined) return 'off';
  return slot.preferred ? 'preferred' : 'available';
}

/** off → available → preferred → off: one thumb, three states. */
function cycleSlot(slots: readonly DaySlot[], date: string, part: DayPart): DaySlot[] {
  const rest = slots.filter((entry) => !(entry.date === date && entry.part === part));
  const state = slotState(slots, date, part);
  if (state === 'off') return [...rest, { date, part, preferred: false }];
  if (state === 'available') return [...rest, { date, part, preferred: true }];
  return rest;
}

function previewFor(draft: ActivityDraft): ProposalPreview | null {
  if (draft.city === null || draft.practice.trim().length === 0 || draft.slots.length === 0) return null;
  return buildProposalPreview({
    practice: draft.practice,
    cityName: draft.city.name,
    timezone: draft.city.timezone,
    availability: slotsToAvailability(draft.slots, draft.city.timezone),
    durationMinutes: draft.durationMinutes,
    ...(draft.level !== null ? { level: { value: draft.level.value, mandatory: draft.level.mandatory } } : {}),
    ...(draft.freeOnly !== null ? { freeOnly: { value: true as const, mandatory: draft.freeOnly.mandatory } } : {}),
  });
}

/**
 * Activity search → results → proposal preview.
 *
 * Everything the person enters stays in this tab (lib/activity-draft.ts). The
 * form works before any session exists; the search itself asks for one, and
 * the demo identity flow brings the person straight back here with their
 * inputs intact. Nothing on this screen publishes or joins anything: results
 * link to the existing Signal page, where joining goes through its own
 * policy, and the proposal is a preview only.
 */
export function ActivitySearch({
  signedIn,
  now,
  defaultCity,
}: {
  signedIn: boolean;
  now: string;
  defaultCity: DraftCity | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ActivityDraft>({ ...EMPTY_DRAFT, city: defaultCity });
  const [restored, setRestored] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<readonly CityResult[]>([]);
  const [view, setView] = useState<ActivitySearchView | null>(null);
  const [preview, setPreview] = useState<ProposalPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const citySeq = useRef(createSearchSequence());
  const autoRan = useRef(false);

  async function runSearch(current: ActivityDraft): Promise<void> {
    const nextPreview = previewFor(current);
    setPreview(nextPreview);
    setError(null);
    if (!signedIn || current.city === null || nextPreview === null) {
      setView(null);
      return;
    }
    setBusy(true);
    const result = await api.post<ActivitySearchView>('/api/activities/search', {
      practice: current.practice,
      geoScopeId: current.city.id,
      slots: current.slots,
      durationMinutes: current.durationMinutes,
      ...(current.level !== null ? { level: current.level } : {}),
      ...(current.freeOnly !== null ? { freeOnly: current.freeOnly } : {}),
    });
    setBusy(false);
    if (result.ok) setView(result.value);
    else {
      setView(null);
      setError(result.message);
    }
  }

  // Restore once, after hydration: storage is not available on the server.
  useEffect(() => {
    const saved = loadDraft();
    if (saved !== null) setDraft({ ...saved, city: saved.city ?? defaultCity });
    setRestored(true);
  }, [defaultCity]);

  useEffect(() => {
    if (restored) saveDraft(draft);
  }, [draft, restored]);

  // Coming back from the demo identity flow with a complete draft: run the
  // search the person had asked for, once. Still only a read.
  useEffect(() => {
    if (!restored || autoRan.current || !signedIn) return;
    autoRan.current = true;
    if (previewFor(draft) !== null) void runSearch(draft);
  }, [restored]);

  function update(patch: Partial<ActivityDraft>): void {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function searchCity(value: string): Promise<void> {
    setCityQuery(value);
    if (value.trim().length === 0) {
      citySeq.current.cancel();
      setCityResults([]);
      return;
    }
    const token = citySeq.current.begin();
    const result = await api.get<{ cities: CityResult[] }>(`/api/cities?q=${encodeURIComponent(value)}`);
    if (!citySeq.current.isCurrent(token)) return;
    if (result.ok) setCityResults(result.value.cities.filter((city) => city.timezone !== null));
  }

  function chooseCity(city: CityResult): void {
    if (city.timezone === null) return;
    citySeq.current.cancel();
    setCityQuery('');
    setCityResults([]);
    update({ city: { id: city.id, name: city.name, timezone: city.timezone }, slots: [] });
  }

  function continueToSignIn(): void {
    saveDraft(draft);
    rememberReturnTo('/search');
    router.push('/welcome#get-access');
  }

  const dates = draft.city === null ? [] : upcomingLocalDates(now, draft.city.timezone, 7);
  const ready = previewFor(draft) !== null;

  return (
    <div className="stack">
      <header className="pagehead">
        <h1>Find something to do</h1>
        <p className="pagehead__sub">
          Say what you want to do, where and when. You will see what is already open — and the
          proposal your search would become, even if nobody has suggested it yet.
        </p>
      </header>

      <section className="card card--pad stack" aria-labelledby="search-form-title">
        <h2 id="search-form-title">Your search</h2>

        <label className="field">
          <span>What do you want to do?</span>
          <input
            className="input"
            type="text"
            maxLength={40}
            value={draft.practice}
            placeholder="Climbing, a walk, padel…"
            onChange={(event) => update({ practice: event.target.value })}
          />
        </label>

        <div className="stack stack--tight">
          <p className="field-label">
            City: <strong>{draft.city?.name ?? 'none chosen'}</strong>
          </p>
          <label className="field">
            <span>Search a city</span>
            <input
              className="input"
              type="search"
              value={cityQuery}
              placeholder="Any city on earth"
              onChange={(event) => void searchCity(event.target.value)}
            />
          </label>
          {cityResults.length > 0 ? (
            <div className="searchresults">
              {cityResults.map((city) => (
                <button key={city.id} type="button" className="result" onClick={() => chooseCity(city)}>
                  <span>{city.name}</span>
                  <span className="faint spacer">{city.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {draft.city !== null ? (
          <fieldset className="stack stack--tight">
            <legend>When are you free?</legend>
            <p className="faint">
              Tap once for “free”, twice for “preferred”. Times are local to {draft.city.name}
              {' '}(morning 08–12, afternoon 12–18, evening 18–22). This demo’s clock reads{' '}
              {dayLabel(upcomingLocalDates(now, draft.city.timezone, 1)[0] ?? '')}.
            </p>
            {dates.map((date) => (
              <div key={date} className="row row--wrap">
                <span className="daylabel">{dayLabel(date)}</span>
                {DAY_PARTS.map((part) => {
                  const state = slotState(draft.slots, date, part);
                  return (
                    <button
                      key={part}
                      type="button"
                      className={
                        state === 'off'
                          ? 'btn btn--small'
                          : state === 'available'
                            ? 'btn btn--small btn--primary'
                            : 'btn btn--small btn--primary slot--preferred'
                      }
                      aria-label={`${dayLabel(date)} ${part}: ${state === 'off' ? 'not free' : state}`}
                      onClick={() => update({ slots: cycleSlot(draft.slots, date, part) })}
                    >
                      {PART_LABELS[part]}
                      {state === 'preferred' ? ' ★' : ''}
                    </button>
                  );
                })}
              </div>
            ))}
          </fieldset>
        ) : null}

        <label className="field">
          <span>How long?</span>
          <select
            className="input"
            value={draft.durationMinutes}
            onChange={(event) => update({ durationMinutes: Number(event.target.value) })}
          >
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes < 60 ? `${minutes} min` : `${minutes / 60} h`.replace('.5 h', ' h 30')}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Level</span>
          <select
            className="input"
            value={draft.level === null ? '' : `${draft.level.value}:${draft.level.mandatory ? 'must' : 'prefer'}`}
            onChange={(event) => {
              const [value, how] = event.target.value.split(':');
              update({
                level: value === undefined || value === '' ? null : { value: value as Level, mandatory: how === 'must' },
              });
            }}
          >
            <option value="">No preference</option>
            {(['beginner', 'intermediate', 'advanced'] as const).map((value) => (
              <optgroup key={value} label={value}>
                <option value={`${value}:prefer`}>{value}, preferably</option>
                <option value={`${value}:must`}>{value} only</option>
              </optgroup>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Cost</span>
          <select
            className="input"
            value={draft.freeOnly === null ? '' : draft.freeOnly.mandatory ? 'must' : 'prefer'}
            onChange={(event) =>
              update({
                freeOnly: event.target.value === '' ? null : { mandatory: event.target.value === 'must' },
              })
            }
          >
            <option value="">No preference</option>
            <option value="prefer">Free, preferably</option>
            <option value="must">Free only</option>
          </select>
        </label>

        {error !== null ? <p className="notice notice--warn">{error}</p> : null}

        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!ready || busy}
          onClick={() => void runSearch(draft)}
        >
          {signedIn ? 'Search' : 'Show my proposal'}
        </button>
        {!ready ? <p className="faint">Add what you want to do, a city and at least one time.</p> : null}
      </section>

      {!signedIn && preview !== null ? (
        <section className="notice stack stack--tight" aria-live="polite">
          <p>
            To see activities already open in {preview.cityName}, continue with a demo account. Your
            search stays on this device and comes back with you.
          </p>
          <button type="button" className="btn btn--primary btn--block" onClick={continueToSignIn}>
            Continue with demo access
          </button>
        </section>
      ) : null}

      {view !== null && preview !== null ? (
        <section className="stack" aria-labelledby="results-title" aria-live="polite">
          <h2 id="results-title">Open activities</h2>
          {view.results.length === 0 ? (
            <p className="empty">
              Nobody has proposed {preview.practiceKey.replace(/-/g, ' ')} in {preview.cityName} for those
              times yet. Your proposal is below.
            </p>
          ) : (
            view.results.map((result) => (
              <article key={result.card.signal.id} className="card card--pad stack stack--tight">
                <div className="row row--wrap">
                  <span className="chip">{SIGNAL_LABELS[result.card.signal.type]}</span>
                  <span className={result.match.verdict === 'compatible' ? 'chip chip--info' : 'chip chip--context'}>
                    {VERDICT_LABELS[result.match.verdict as Exclude<Verdict, 'incompatible'>]}
                  </span>
                </div>
                <Link href={`/signals/${result.card.signal.id}`}>
                  <h3>{result.card.signal.title}</h3>
                </Link>
                <ul className="reasons">
                  {result.match.reasons.map((reason) => (
                    <li key={`${reason.criterion}-${reason.text}`} data-outcome={reason.outcome}>
                      <span aria-hidden="true">{OUTCOME_MARKS[reason.outcome]}</span>{' '}
                      <span className="visually-hidden">{OUTCOME_WORDS[reason.outcome]}: </span>
                      {reason.text}
                    </li>
                  ))}
                </ul>
                {!result.card.isHost && !result.card.eligibility.allowed ? (
                  <p className="faint">{explain(result.card.eligibility.reason)}</p>
                ) : null}
              </article>
            ))
          )}
          {view.notCompatible > 0 ? (
            <p className="faint">
              {view.notCompatible} other open {view.notCompatible === 1 ? 'activity' : 'activities'} here
              {view.notCompatible === 1 ? ' does' : ' do'} not fit these times or criteria.
            </p>
          ) : null}
        </section>
      ) : null}

      {preview !== null ? (
        <section className="card card--pad stack stack--tight" aria-labelledby="preview-title">
          <span className="chip chip--context">Preview — not published</span>
          <h2 id="preview-title">{preview.title}</h2>
          <p className="muted">
            {preview.durationMinutes} min · local times in {preview.cityName}
          </p>
          <ul className="reasons">
            {preview.windows.map((window) => (
              <li key={window.label}>
                {window.label}
                {window.preferred ? ' ★ preferred' : ''}
              </li>
            ))}
          </ul>
          {preview.criteria.length > 0 ? (
            <ul className="reasons">
              {preview.criteria.map((criterion) => (
                <li key={criterion.label}>
                  {criterion.label} — {criterion.mandatory ? 'required' : 'preferred'}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="faint">
            No equipment needed unless you add some. Cost: {preview.cost === 'free' ? 'free' : 'not stated'}.
          </p>
          <p className="notice">
            Nothing has been published or joined. Publishing a proposal from here comes in a later
            step: proposing without hosting still awaits an owner decision.
          </p>
        </section>
      ) : null}
    </div>
  );
}
