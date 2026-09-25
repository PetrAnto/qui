import type { Instant, UserId } from '../types';

/**
 * Time is the only thing an activity is allowed to be precise about.
 *
 * Every shape in this directory is time-only: nothing here can hold a
 * coordinate, so INV-GEO-1 stays structural. Instants are UTC ISO-8601; the
 * IANA time zone travels next to them so that "Saturday morning" keeps the
 * meaning the person gave it, whatever server clock reads it.
 */
export interface Interval {
  readonly start: Instant;
  readonly end: Instant;
}

export interface AvailabilityInterval extends Interval {
  /** A time the person would rather have, not the only time they can do. */
  readonly preferred?: boolean;
}

/**
 * One person's actual availability, as they declared it. The intervals are
 * kept as given — never reduced to a yes/no against somebody else's window —
 * so that moving an activity's date is re-checked against what the person
 * really said, instead of silently carrying an old "yes" onto a new time.
 */
export interface AvailabilityDeclaration {
  readonly userId: UserId;
  /** IANA zone the intervals were expressed in, e.g. "Europe/Paris". */
  readonly timezone: string;
  readonly intervals: readonly AvailabilityInterval[];
}

const MINUTE_MS = 60_000;

export function toMs(instant: Instant): number {
  return Date.parse(instant);
}

function fromMs(ms: number): Instant {
  return new Date(ms).toISOString();
}

export function isValidInterval(interval: Interval): boolean {
  const start = toMs(interval.start);
  const end = toMs(interval.end);
  return Number.isFinite(start) && Number.isFinite(end) && start < end;
}

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function minutesOf(interval: Interval): number {
  return Math.floor((toMs(interval.end) - toMs(interval.start)) / MINUTE_MS);
}

/** The shared part of two intervals, or null when they only touch or miss. */
export function overlapOf(a: Interval, b: Interval): Interval | null {
  const start = Math.max(toMs(a.start), toMs(b.start));
  const end = Math.min(toMs(a.end), toMs(b.end));
  return start < end ? { start: fromMs(start), end: fromMs(end) } : null;
}

/** True when `outer` contains the whole of `inner`. */
export function covers(outer: Interval, inner: Interval): boolean {
  return toMs(outer.start) <= toMs(inner.start) && toMs(outer.end) >= toMs(inner.end);
}

/** The part of an interval that is still ahead of `now`, or null if none is. */
export function futurePart(interval: Interval, now: Instant): Interval | null {
  return overlapOf(interval, { start: now, end: '9999-12-31T23:59:59.999Z' });
}

/** "Sat 10:00" in the given zone. */
export function formatInstant(instant: Instant, timezone: string): string {
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: timezone });
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  });
  const at = new Date(instant);
  return `${day.format(at)} ${time.format(at)}`;
}

/**
 * "Sat 10:00–12:00", or "Sat 22:00–Sun 01:00" across midnight, in the zone the
 * activity happens in. Deterministic for a given zone database.
 */
export function formatInterval(interval: Interval, timezone: string): string {
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: timezone });
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  });
  const date = new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeZone: timezone });
  const start = new Date(interval.start);
  const end = new Date(interval.end);
  const sameDay = date.format(start) === date.format(end);
  return sameDay
    ? `${day.format(start)} ${time.format(start)}–${time.format(end)}`
    : `${day.format(start)} ${time.format(start)}–${day.format(end)} ${time.format(end)}`;
}
