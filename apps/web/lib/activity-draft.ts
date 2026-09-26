import { DAY_PARTS, isLocalDate, isValidTimeZone, type DayPart, type DaySlot, type Level } from '@indenoi/core';

/**
 * The activity-search draft, kept in the browser only.
 *
 * What somebody is looking for can be personal ("beginner", "free only", the
 * evenings they are free), so it never goes into a URL, a cookie or the
 * server's memory: it lives in this tab's `sessionStorage` and travels to the
 * server only in the body of an explicit search request. It survives the demo
 * identity flow — /search → /welcome onboarding → back to /search — because
 * that flow stays in the same tab.
 *
 * Storage is untrusted input: whatever is read back is validated field by
 * field, and anything malformed is dropped rather than half-used.
 */
export interface DraftCity {
  readonly id: string;
  readonly name: string;
  readonly timezone: string;
}

export interface ActivityDraft {
  readonly v: 1;
  readonly practice: string;
  readonly city: DraftCity | null;
  readonly slots: readonly DaySlot[];
  readonly durationMinutes: number;
  readonly level: { readonly value: Level; readonly mandatory: boolean } | null;
  readonly freeOnly: { readonly mandatory: boolean } | null;
}

export const DRAFT_KEY = 'qui.activity-search.draft.v1';
export const RETURN_KEY = 'qui.return-to';
/** Set once onboarding finishes after an explicit "Continue"; consumed by /search. */
export const RESUME_KEY = 'qui.activity-search.resume.v1';
/** How long an explicit "Continue with demo access" stays valid. */
const RETURN_TTL_MS = 30 * 60 * 1000;
/** How long a finished onboarding may take to land back on /search. */
const RESUME_TTL_MS = 5 * 60 * 1000;
export const DURATIONS = [60, 90, 120, 180] as const;
const LEVELS: readonly Level[] = ['any', 'beginner', 'intermediate', 'advanced'];
/** The only place a post-onboarding return may lead. Never an arbitrary URL. */
const RETURN_TARGETS = ['/search'] as const;

export const EMPTY_DRAFT: ActivityDraft = {
  v: 1,
  practice: '',
  city: null,
  slots: [],
  durationMinutes: 90,
  level: null,
  freeOnly: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSlot(value: unknown): DaySlot | null {
  if (!isRecord(value)) return null;
  const { date, part, preferred } = value;
  if (typeof date !== 'string' || !isLocalDate(date)) return null;
  if (typeof part !== 'string' || !(DAY_PARTS as readonly string[]).includes(part)) return null;
  return { date, part: part as DayPart, preferred: preferred === true };
}

/** Returns a valid draft or null; never a partially trusted one. */
export function parseDraft(raw: string | null): ActivityDraft | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || value['v'] !== 1) return null;
  const { practice, city, slots, durationMinutes, level, freeOnly } = value;
  if (typeof practice !== 'string' || practice.length > 40) return null;
  let parsedCity: DraftCity | null = null;
  if (city !== null) {
    if (!isRecord(city)) return null;
    const { id, name, timezone } = city;
    if (typeof id !== 'string' || typeof name !== 'string' || typeof timezone !== 'string') return null;
    // Every time helper on the page goes through Intl with this zone; an
    // unknown zone would throw during render, so the draft is refused instead.
    if (id.length === 0 || name.length === 0 || !isValidTimeZone(timezone)) return null;
    parsedCity = { id, name, timezone };
  }
  if (!Array.isArray(slots) || slots.length > 21) return null;
  const parsedSlots = slots.map(parseSlot);
  if (parsedSlots.some((slot) => slot === null)) return null;
  if (typeof durationMinutes !== 'number' || !(DURATIONS as readonly number[]).includes(durationMinutes)) return null;
  let parsedLevel: ActivityDraft['level'] = null;
  if (level !== null) {
    if (!isRecord(level) || !LEVELS.includes(level['value'] as Level)) return null;
    parsedLevel = { value: level['value'] as Level, mandatory: level['mandatory'] === true };
  }
  let parsedFree: ActivityDraft['freeOnly'] = null;
  if (freeOnly !== null) {
    if (!isRecord(freeOnly)) return null;
    parsedFree = { mandatory: freeOnly['mandatory'] === true };
  }
  return {
    v: 1,
    practice,
    city: parsedCity,
    slots: parsedSlots as DaySlot[],
    durationMinutes,
    level: parsedLevel,
    freeOnly: parsedFree,
  };
}

export function serializeDraft(draft: ActivityDraft): string {
  return JSON.stringify(draft);
}

/** sessionStorage can be missing or throw (private mode, blocked storage); the page still works. */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadDraft(): ActivityDraft | null {
  try {
    return parseDraft(storage()?.getItem(DRAFT_KEY) ?? null);
  } catch {
    return null;
  }
}

export function saveDraft(draft: ActivityDraft): void {
  try {
    storage()?.setItem(DRAFT_KEY, serializeDraft(draft));
  } catch {
    // Not persisting is acceptable; losing the page is not.
  }
}

/** Reads and removes a timestamped marker; returns it only if well formed and fresh. */
function takeFresh(key: string, ttlMs: number): Record<string, unknown> | null {
  try {
    const store = storage();
    const raw = store?.getItem(key) ?? null;
    store?.removeItem(key);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || typeof value['at'] !== 'number') return null;
    const age = Date.now() - value['at'];
    return age >= 0 && age <= ttlMs ? value : null;
  } catch {
    return null;
  }
}

/**
 * The continuation, in steps, so that only an explicit "Continue with demo
 * access" followed by a *finished* onboarding resumes a search:
 *
 * 1. `rememberReturnTo` — the person tapped Continue on /search.
 * 2. `takeReturnTo` + `markResumeReady` — onboarding finished and sends them back.
 * 3. `takeResumeReady` — /search consumes it once, before sending the request.
 *
 * `clearContinuation` drops both when the person is back on /search without a
 * session (the sign-in was abandoned), and both markers expire, so a later,
 * unrelated sign-in never fires an old search. Ordinary visits and reloads
 * find no marker and restore the draft without sending it. Without storage
 * nothing is marked, and the search is simply manual.
 */
export function rememberReturnTo(path: (typeof RETURN_TARGETS)[number]): void {
  try {
    storage()?.setItem(RETURN_KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // Without storage the person simply lands on Discover after onboarding.
  }
}

/** Reads and clears the pending return. Only an allow-listed internal path is ever returned. */
export function takeReturnTo(): string | null {
  const value = takeFresh(RETURN_KEY, RETURN_TTL_MS);
  const path = value?.['path'];
  return typeof path === 'string' && (RETURN_TARGETS as readonly string[]).includes(path) ? path : null;
}

export function markResumeReady(): void {
  try {
    storage()?.setItem(RESUME_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    // Without storage the person searches manually.
  }
}

/** True once, right after a finished onboarding; consumed before any request is sent. */
export function takeResumeReady(): boolean {
  return takeFresh(RESUME_KEY, RESUME_TTL_MS) !== null;
}

export function clearContinuation(): void {
  try {
    const store = storage();
    store?.removeItem(RETURN_KEY);
    store?.removeItem(RESUME_KEY);
  } catch {
    // Nothing to clear.
  }
}
