import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DRAFT_KEY,
  EMPTY_DRAFT,
  RETURN_KEY,
  clearContinuation,
  loadDraft,
  markResumeReady,
  parseDraft,
  rememberReturnTo,
  saveDraft,
  serializeDraft,
  takeResumeReady,
  takeReturnTo,
  type ActivityDraft,
} from '../lib/activity-draft';

const DRAFT: ActivityDraft = {
  v: 1,
  practice: 'climbing',
  city: { id: 'geo:city:lyon', name: 'Lyon', timezone: 'Europe/Paris' },
  slots: [
    { date: '2026-08-18', part: 'afternoon', preferred: false },
    { date: '2026-08-19', part: 'evening', preferred: true },
  ],
  durationMinutes: 120,
  level: { value: 'beginner', mandatory: false },
  freeOnly: { mandatory: true },
};

/** A minimal tab-scoped storage, standing in for the browser's sessionStorage. */
function fakeSessionStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

const scope = globalThis as unknown as { window?: { sessionStorage: Storage } };

beforeEach(() => {
  scope.window = { sessionStorage: fakeSessionStorage() };
});

afterEach(() => {
  delete scope.window;
});

describe('the activity-search draft', () => {
  it('round-trips every input exactly', () => {
    expect(parseDraft(serializeDraft(DRAFT))).toEqual(DRAFT);
    saveDraft(DRAFT);
    expect(loadDraft()).toEqual(DRAFT);
    expect(parseDraft(serializeDraft(EMPTY_DRAFT))).toEqual(EMPTY_DRAFT);
  });

  it('rejects anything malformed as a whole, never half-trusting it', () => {
    for (const raw of [
      null,
      'not json',
      '[]',
      JSON.stringify({ ...DRAFT, v: 2 }),
      JSON.stringify({ ...DRAFT, practice: 'x'.repeat(41) }),
      JSON.stringify({ ...DRAFT, slots: [{ date: '2026-02-30', part: 'morning' }] }),
      JSON.stringify({ ...DRAFT, slots: [{ date: '2026-08-18', part: 'night' }] }),
      JSON.stringify({ ...DRAFT, durationMinutes: 45 }),
      JSON.stringify({ ...DRAFT, level: { value: 'expert', mandatory: true } }),
      JSON.stringify({ ...DRAFT, city: { id: 'geo:city:lyon', name: 'Lyon' } }),
      JSON.stringify({ ...DRAFT, city: { id: 'geo:city:lyon', name: 'Lyon', timezone: 'Invalid/Zone' } }),
      JSON.stringify({ ...DRAFT, city: { id: 'geo:city:lyon', name: 'Lyon', timezone: '' } }),
    ]) {
      expect(parseDraft(raw)).toBeNull();
    }
  });

  it('is not written anywhere a URL could carry it', () => {
    saveDraft(DRAFT);
    // Nothing about the draft is encoded in the only navigation target it uses.
    rememberReturnTo('/search');
    expect(scope.window?.sessionStorage.getItem(RETURN_KEY)).not.toContain('climbing');
  });
});

describe('a stored draft with a valid zone', () => {
  it('survives unchanged, in any valid zone', () => {
    const tokyo: ActivityDraft = { ...DRAFT, city: { id: 'geo:city:gn-1850147', name: 'Tokyo', timezone: 'Asia/Tokyo' } };
    saveDraft(tokyo);
    expect(loadDraft()).toEqual(tokyo);
  });

  it('is dropped, not crashed on, when its zone is not a real one', () => {
    scope.window?.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...DRAFT, city: { ...DRAFT.city, timezone: 'Invalid/Zone' } }),
    );
    expect(loadDraft()).toBeNull();
  });
});

describe('returning after the demo identity flow', () => {
  it('returns to the search once, then forgets it', () => {
    rememberReturnTo('/search');
    expect(takeReturnTo()).toBe('/search');
    expect(takeReturnTo()).toBeNull();
  });

  it('never follows a tampered return target', () => {
    for (const target of ['https://evil.example', '//evil.example', '/me', 'javascript:alert(1)']) {
      scope.window?.sessionStorage.setItem(RETURN_KEY, target);
      expect(takeReturnTo()).toBeNull();
    }
  });

  it('degrades to Discover when storage is unavailable', () => {
    delete scope.window;
    expect(loadDraft()).toBeNull();
    expect(takeReturnTo()).toBeNull();
    expect(() => saveDraft(DRAFT)).not.toThrow();
  });
});

describe('resuming a search after the demo identity flow', () => {
  it('resumes exactly once, and only after the explicit continue and a finished onboarding', () => {
    // An ordinary visit or reload: nothing to resume.
    expect(takeResumeReady()).toBe(false);

    rememberReturnTo('/search'); // "Continue with demo access"
    expect(takeResumeReady()).toBe(false); // not before onboarding finishes
    expect(takeReturnTo()).toBe('/search'); // onboarding finishes…
    markResumeReady(); // …and hands the resumption to /search
    expect(takeResumeReady()).toBe(true);
    expect(takeResumeReady()).toBe(false); // consumed
  });

  it('lets an abandoned continuation expire instead of firing later', () => {
    rememberReturnTo('/search');
    clearContinuation(); // back on /search without a session: the flow was abandoned
    expect(takeReturnTo()).toBeNull();
    expect(takeResumeReady()).toBe(false);
  });

  it('ignores stale markers', () => {
    const old = Date.now() - 2 * 60 * 60 * 1000;
    scope.window?.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ path: '/search', at: old }));
    expect(takeReturnTo()).toBeNull();
    markResumeReady();
    const raw = scope.window?.sessionStorage.getItem('qui.activity-search.resume.v1') ?? '';
    scope.window?.sessionStorage.setItem('qui.activity-search.resume.v1', raw.replace(/"at":\d+/, `"at":${old}`));
    expect(takeResumeReady()).toBe(false);
  });

  it('falls back to a manual search when storage is unavailable', () => {
    delete scope.window;
    expect(() => markResumeReady()).not.toThrow();
    expect(takeResumeReady()).toBe(false);
  });
});
