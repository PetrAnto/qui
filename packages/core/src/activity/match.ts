import type { GeoScopeId, Instant, SignalId } from '../types';
import { formatMoney, isFree, perPersonCost, withinBudget, type ActivityCost, type Money } from './cost';
import {
  equipmentCoverage,
  type EquipmentContribution,
  type EquipmentCoverage,
  type EquipmentNeed,
} from './equipment';
import {
  covers,
  formatInstant,
  formatInterval,
  futurePart,
  minutesOf,
  overlapOf,
  toMs,
  type AvailabilityInterval,
  type Interval,
} from './interval';
import { activeParticipants, remainingPlaces, type Capacity, type Participation } from './participation';

/**
 * Compatibility between what a person is looking for and an activity.
 *
 * Pure and deterministic, like ranking (ADR-0008): same inputs, same answer,
 * and every answer carries its reasons. It is deliberately *not* a permission
 * check. Whether the viewer may see an activity is decided before it gets here
 * (the caller passes only activities already projected for that viewer), and
 * whether they may join is a separate policy decision that stays with
 * `canJoinEvent`. Nothing in this module takes a viewer, and nothing here
 * publishes, joins or writes.
 *
 * It is not wired into any route or service yet.
 */

export type Level = 'any' | 'beginner' | 'intermediate' | 'advanced';

export interface Wish<T> {
  readonly value: T;
  /** Mandatory filters; a preference only reorders. */
  readonly mandatory: boolean;
}

export interface ActivityQuery {
  readonly practiceKey: string;
  readonly geoScopeId: GeoScopeId;
  /** IANA zone the person expressed their availability in. */
  readonly timezone: string;
  readonly availability: readonly AvailabilityInterval[];
  /** Extra minimum the person wants, on top of the activity's own duration. */
  readonly minimumMinutes?: number;
  readonly budgetPerPerson?: Wish<Money>;
  readonly costType?: Wish<'free_only' | 'shared_cost_ok'>;
  readonly level?: Wish<Level>;
}

export type ActivityTiming =
  /** A fixed appointment with a known end. */
  | { readonly kind: 'scheduled'; readonly appointment: Interval }
  /** A start time without an end — how every existing signal stores time. */
  | { readonly kind: 'start_only'; readonly start: Instant }
  /** Not fixed yet: candidate windows and how long it takes. */
  | { readonly kind: 'proposed'; readonly windows: readonly Interval[]; readonly durationMinutes: number }
  | { readonly kind: 'unknown' };

/**
 * The structured facts matching needs about an activity, and nothing else.
 *
 * No title, body, meeting point or other free text: those are joined back by
 * the caller *after* the visibility projection, so a name typed into a
 * description can never travel through a match result. Participant ids are an
 * input for counting and coverage and never appear in the output.
 *
 * `null` means unknown. An existing signal with no plan is described honestly
 * (see `describeSignal`) rather than given invented attributes.
 */
export interface ActivityDescriptor {
  readonly signalId: SignalId;
  readonly geoScopeId: GeoScopeId;
  readonly timezone: string | null;
  readonly live: boolean;
  readonly practiceKey: string | null;
  readonly timing: ActivityTiming;
  readonly capacity: Capacity;
  readonly participation: Participation;
  readonly cost: ActivityCost;
  readonly level: Level | null;
  readonly equipment: {
    readonly needs: readonly EquipmentNeed[];
    readonly contributions: readonly EquipmentContribution[];
  } | null;
}

export type Criterion = 'open' | 'area' | 'practice' | 'time' | 'places' | 'budget' | 'cost_type' | 'level' | 'equipment';
export type Outcome = 'met' | 'unmet' | 'unknown' | 'info';

export interface MatchReason {
  readonly criterion: Criterion;
  readonly outcome: Outcome;
  readonly mandatory: boolean;
  /** Human-readable, built only from structured values — never free text. */
  readonly text: string;
}

/**
 * - `compatible`: every mandatory criterion is known to be met.
 * - `unconfirmed`: none is known to fail, but at least one is unknown.
 * - `incompatible`: at least one mandatory criterion fails.
 */
export type Verdict = 'compatible' | 'unconfirmed' | 'incompatible';

export interface ActivityMatch {
  readonly signalId: SignalId;
  readonly verdict: Verdict;
  readonly reasons: readonly MatchReason[];
  /** The time this person could actually do it, when one is known. */
  readonly slot: Interval | null;
  readonly slotIsPreferred: boolean;
  readonly placesLeft: number | null;
  /** Coverage for `slot`; null when the activity has no equipment needs or no slot. */
  readonly equipment: EquipmentCoverage | null;
  readonly preferencesMet: number;
}

/** Lower-case, accent-free, hyphenated: "Paddle Board" and "paddle-board" are one key. */
export function normalizePracticeKey(practice: string): string {
  return practice
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface TimeResult {
  readonly reason: MatchReason;
  readonly slot: Interval | null;
  readonly preferred: boolean;
}

function evaluateTime(query: ActivityQuery, activity: ActivityDescriptor, zone: string, now: Instant): TimeResult {
  const mandatory = true;
  const wanted = query.availability;
  const timing = activity.timing;

  if (timing.kind === 'unknown') {
    return {
      reason: { criterion: 'time', outcome: 'unknown', mandatory, text: 'No time given yet' },
      slot: null,
      preferred: false,
    };
  }

  if (timing.kind === 'start_only') {
    if (toMs(timing.start) <= toMs(now)) {
      return { reason: { criterion: 'time', outcome: 'unmet', mandatory, text: 'Already started' }, slot: null, preferred: false };
    }
    const fits = wanted.find(
      (interval) => toMs(interval.start) <= toMs(timing.start) && toMs(timing.start) < toMs(interval.end),
    );
    const label = formatInstant(timing.start, zone);
    return fits === undefined
      ? {
          reason: { criterion: 'time', outcome: 'unmet', mandatory, text: `Starts ${label}, outside your times` },
          slot: null,
          preferred: false,
        }
      : {
          reason: {
            criterion: 'time',
            outcome: 'unknown',
            mandatory,
            text: `Starts ${label}; end time not given`,
          },
          slot: null,
          preferred: fits.preferred === true,
        };
  }

  if (timing.kind === 'scheduled') {
    const appointment = timing.appointment;
    const label = formatInterval(appointment, zone);
    if (toMs(appointment.start) <= toMs(now)) {
      return { reason: { criterion: 'time', outcome: 'unmet', mandatory, text: `${label} has already started` }, slot: null, preferred: false };
    }
    const fits = wanted.find((interval) => covers(interval, appointment));
    if (fits !== undefined) {
      return {
        reason: { criterion: 'time', outcome: 'met', mandatory, text: `Fixed for ${label}, within your times` },
        slot: appointment,
        preferred: fits.preferred === true,
      };
    }
    const partial = wanted.some((interval) => overlapOf(interval, appointment) !== null);
    return {
      reason: {
        criterion: 'time',
        outcome: 'unmet',
        mandatory,
        text: partial
          ? `Fixed for ${label}; you are free for only part of it`
          : `Fixed for ${label}, outside your times`,
      },
      slot: null,
      preferred: false,
    };
  }

  const needed = Math.max(timing.durationMinutes, query.minimumMinutes ?? 0);
  const candidates: { overlap: Interval; preferred: boolean }[] = [];
  let longest = 0;
  for (const window of timing.windows) {
    const ahead = futurePart(window, now);
    if (ahead === null) continue;
    for (const interval of wanted) {
      const overlap = overlapOf(interval, ahead);
      if (overlap === null) continue;
      const minutes = minutesOf(overlap);
      longest = Math.max(longest, minutes);
      if (minutes >= needed) candidates.push({ overlap, preferred: interval.preferred === true });
    }
  }
  candidates.sort(
    (a, b) =>
      Number(b.preferred) - Number(a.preferred) ||
      toMs(a.overlap.start) - toMs(b.overlap.start) ||
      minutesOf(b.overlap) - minutesOf(a.overlap),
  );
  const best = candidates[0];
  if (best === undefined) {
    return {
      reason: {
        criterion: 'time',
        outcome: 'unmet',
        mandatory,
        text:
          longest > 0
            ? `Your times overlap for at most ${longest} min; it needs ${needed} min`
            : 'No overlap with your times',
      },
      slot: null,
      preferred: false,
    };
  }
  return {
    reason: {
      criterion: 'time',
      outcome: 'met',
      mandatory,
      text: `Possible overlap ${formatInterval(best.overlap, zone)} (${minutesOf(best.overlap)} min) — not confirmed until a time is fixed`,
    },
    slot: best.overlap,
    preferred: best.preferred,
  };
}

function evaluateBudget(wish: Wish<Money>, cost: ActivityCost): MatchReason {
  const outcome = withinBudget(cost, wish.value);
  const share = perPersonCost(cost);
  const ceiling = formatMoney(wish.value);
  const text =
    share.status === 'free'
      ? `Free (your limit ${ceiling})`
      : share.status === 'unknown'
        ? `Cost not known (your limit ${ceiling})`
        : share.amount.currency !== wish.value.currency
          ? `Cost in ${share.amount.currency}, your limit is in ${wish.value.currency}`
          : `${share.status === 'estimated' ? '≈ ' : ''}${formatMoney(share.amount)} each (your limit ${ceiling})`;
  return { criterion: 'budget', outcome, mandatory: wish.mandatory, text };
}

function evaluateCostType(wish: Wish<'free_only' | 'shared_cost_ok'>, cost: ActivityCost): MatchReason {
  if (wish.value === 'shared_cost_ok') {
    return { criterion: 'cost_type', outcome: 'met', mandatory: wish.mandatory, text: 'Shared costs are fine for you' };
  }
  const outcome = isFree(cost);
  const share = perPersonCost(cost);
  const text =
    outcome === 'met'
      ? 'Free'
      : outcome === 'unknown'
        ? 'Not known whether it is free'
        : share.status === 'known' || share.status === 'estimated'
          ? `Shared cost ${share.status === 'estimated' ? '≈ ' : ''}${formatMoney(share.amount)} each (you asked for free)`
          : 'Shared cost (you asked for free)';
  return { criterion: 'cost_type', outcome, mandatory: wish.mandatory, text };
}

function evaluateLevel(wish: Wish<Level>, level: Level | null): MatchReason {
  if (wish.value === 'any') return { criterion: 'level', outcome: 'met', mandatory: wish.mandatory, text: 'Any level' };
  if (level === null) return { criterion: 'level', outcome: 'unknown', mandatory: wish.mandatory, text: 'Level not stated' };
  if (level === 'any' || level === wish.value) {
    return { criterion: 'level', outcome: 'met', mandatory: wish.mandatory, text: `Level ${wish.value} ✓` };
  }
  return { criterion: 'level', outcome: 'unmet', mandatory: wish.mandatory, text: `Level ${level} (you asked for ${wish.value})` };
}

function equipmentReason(coverage: EquipmentCoverage, zone: string): MatchReason {
  // Missing equipment is shown, never used to hide the activity: people join
  // precisely because they can bring what is missing.
  const when = formatInterval(coverage.interval, zone);
  if (coverage.complete) {
    return { criterion: 'equipment', outcome: 'info', mandatory: false, text: `Required equipment covered for ${when}` };
  }
  const parts = coverage.needs
    .filter((need) => need.required && need.missing > 0)
    .map((need) => `${need.missing} ${need.kind.replace(/_/g, ' ')}`);
  return { criterion: 'equipment', outcome: 'info', mandatory: false, text: `Missing for ${when}: ${parts.join(', ')}` };
}

export function matchActivity(query: ActivityQuery, activity: ActivityDescriptor, now: Instant): ActivityMatch {
  const zone = activity.timezone ?? query.timezone;
  const reasons: MatchReason[] = [];

  if (!activity.live) {
    reasons.push({ criterion: 'open', outcome: 'unmet', mandatory: true, text: 'No longer open' });
  }
  if (activity.geoScopeId !== query.geoScopeId) {
    reasons.push({ criterion: 'area', outcome: 'unmet', mandatory: true, text: 'Different city' });
  }

  const wantedPractice = normalizePracticeKey(query.practiceKey);
  if (activity.practiceKey === null) {
    reasons.push({ criterion: 'practice', outcome: 'unknown', mandatory: true, text: 'Activity type not stated' });
  } else if (normalizePracticeKey(activity.practiceKey) === wantedPractice) {
    reasons.push({ criterion: 'practice', outcome: 'met', mandatory: true, text: `Same activity: ${wantedPractice}` });
  } else {
    reasons.push({ criterion: 'practice', outcome: 'unmet', mandatory: true, text: 'Different activity' });
  }

  const time = evaluateTime(query, activity, zone, now);
  reasons.push(time.reason);

  const placesLeft = remainingPlaces(activity.capacity, activity.participation);
  if (placesLeft !== null) {
    reasons.push(
      placesLeft > 0
        ? { criterion: 'places', outcome: 'met', mandatory: true, text: `${placesLeft} place${placesLeft === 1 ? '' : 's'} left` }
        : { criterion: 'places', outcome: 'unmet', mandatory: true, text: 'Full' },
    );
  }

  if (query.budgetPerPerson !== undefined) reasons.push(evaluateBudget(query.budgetPerPerson, activity.cost));
  if (query.costType !== undefined) reasons.push(evaluateCostType(query.costType, activity.cost));
  if (query.level !== undefined) reasons.push(evaluateLevel(query.level, activity.level));

  let equipment: EquipmentCoverage | null = null;
  if (activity.equipment !== null && activity.equipment.needs.length > 0 && time.slot !== null) {
    equipment = equipmentCoverage({
      interval: time.slot,
      needs: activity.equipment.needs,
      contributions: activity.equipment.contributions,
      participantIds: activeParticipants(activity.participation).ids,
      organizerId: activity.participation.organizerId,
    });
    reasons.push(equipmentReason(equipment, zone));
  }

  const mandatory = reasons.filter((reason) => reason.mandatory);
  const verdict: Verdict = mandatory.some((reason) => reason.outcome === 'unmet')
    ? 'incompatible'
    : mandatory.some((reason) => reason.outcome === 'unknown')
      ? 'unconfirmed'
      : 'compatible';

  return {
    signalId: activity.signalId,
    verdict,
    reasons,
    slot: time.slot,
    slotIsPreferred: time.preferred,
    placesLeft,
    equipment,
    preferencesMet: reasons.filter((reason) => !reason.mandatory && reason.outcome === 'met').length,
  };
}

const VERDICT_ORDER: Readonly<Record<Verdict, number>> = { compatible: 0, unconfirmed: 1, incompatible: 2 };

/**
 * Every activity, matched and ordered. Order uses only the fit between the
 * request and the activity — never who created it, how popular they are or
 * whether anyone paid (EQUAL, doctrine §3.3). Ties break on the id so the
 * same inputs always give the same list.
 */
export function matchActivities(
  query: ActivityQuery,
  activities: readonly ActivityDescriptor[],
  now: Instant,
): readonly ActivityMatch[] {
  return activities
    .map((activity) => matchActivity(query, activity, now))
    .sort(
      (a, b) =>
        VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
        Number(b.slotIsPreferred) - Number(a.slotIsPreferred) ||
        b.preferencesMet - a.preferencesMet ||
        (a.slot === null ? 1 : 0) - (b.slot === null ? 1 : 0) ||
        (a.slot !== null && b.slot !== null ? toMs(a.slot.start) - toMs(b.slot.start) : 0) ||
        (a.signalId < b.signalId ? -1 : a.signalId > b.signalId ? 1 : 0),
    );
}
