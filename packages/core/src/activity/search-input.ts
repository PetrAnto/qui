import type { Instant } from '../types';
import type { AvailabilityInterval } from './interval';

/**
 * Turning what a person picks on a phone — "Tuesday afternoon", "Saturday
 * morning, preferably" — into time intervals, in the zone of the city the
 * activity happens in. Pure, so the same conversion runs in the browser (for
 * the preview) and on the server (for matching) and cannot disagree.
 */

export const DAY_PARTS = ['morning', 'afternoon', 'evening'] as const;
export type DayPart = (typeof DAY_PARTS)[number];

/** Local wall-clock bounds of each part of the day, [start, end) in hours. */
export const DAY_PART_HOURS: Readonly<Record<DayPart, readonly [number, number]>> = {
  morning: [8, 12],
  afternoon: [12, 18],
  evening: [18, 22],
};

export interface DaySlot {
  /** Local calendar date in the city, YYYY-MM-DD. */
  readonly date: string;
  readonly part: DayPart;
  readonly preferred: boolean;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDate(value: string): boolean {
  const match = DATE.exec(value);
  if (match === null) return false;
  const [, y, m, d] = match;
  const at = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return at.toISOString().slice(0, 10) === value;
}

/** Offset of `timezone` from UTC at the instant `ms`, in milliseconds. */
function offsetAt(ms: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/**
 * The instant at which the wall clock in `timezone` reads `date` `hour`:00.
 *
 * The offsets a day before and a day after bracket any daylight-saving change,
 * so the two candidates they give cover every case:
 *  - normal time: both agree;
 *  - a repeated autumn hour: both read back as the wall time — the earlier
 *    (first occurrence) is used;
 *  - a spring gap: neither reads back — the wall time does not exist, and the
 *    later candidate is the first valid instant after the gap.
 */
export function zonedTimeToInstant(date: string, hour: number, timezone: string): Instant {
  const match = DATE.exec(date);
  if (match === null) throw new Error('invalid local date');
  const [, y, m, d] = match;
  const wall = Date.UTC(Number(y), Number(m) - 1, Number(d), hour);
  const day = 86_400_000;
  const candidates = [wall - offsetAt(wall - day, timezone), wall - offsetAt(wall + day, timezone)];
  const exact = candidates.filter((instant) => instant + offsetAt(instant, timezone) === wall);
  const chosen = exact.length > 0 ? Math.min(...exact) : Math.max(...candidates);
  return new Date(chosen).toISOString();
}

/** One interval per chosen slot; adjacent slots stay separate intervals on purpose. */
export function slotsToAvailability(slots: readonly DaySlot[], timezone: string): readonly AvailabilityInterval[] {
  return slots.map((slot) => {
    const [from, to] = DAY_PART_HOURS[slot.part];
    return {
      start: zonedTimeToInstant(slot.date, from, timezone),
      end: zonedTimeToInstant(slot.date, to, timezone),
      ...(slot.preferred ? { preferred: true } : {}),
    };
  });
}

/** The local dates of the `count` days starting with the day `now` falls on in `timezone`. */
export function upcomingLocalDates(now: Instant, timezone: string, count: number): readonly string[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, dateStyle: 'short' }).format(new Date(now));
  const match = DATE.exec(today);
  if (match === null) return [];
  const [, y, m, d] = match;
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + index)).toISOString().slice(0, 10),
  );
}
