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
  /**
   * The possible overlap between this person's times and the activity: for a
   * proposed activity, the whole shared window (it can be longer than the
   * activity); for a scheduled one, the appointment itself. Never an
   * appointment in its own right.
   */
  readonly overlap: Interval | null;
  readonly overlapIsPreferred: boolean;
  /**
   * One activity-length interval inside `overlap`, used to judge equipment.
   * For a proposed activity it is the interval confirmed equipment covers
   * best — not necessarily the earliest — and it is a candidate, not a fixed
   * time. For a scheduled activity it is the whole appointment.
   */
  readonly candidate: Interval | null;
  readonly placesLeft: number | null;
  /** Coverage for `candidate`; null when the activity has no equipment needs or no candidate. */
  readonly equipment: EquipmentCoverage | null;
  readonly preferencesMet: number;
}

/**
 * One key per practice, in any script: "Paddle Board" and "paddle-board" are
 * one key, and so are the composed and decomposed spellings of the same word.
 *
 * - Compatibility forms are folded (full-width "ＹＯＧＡ" is "yoga").
 * - Accents are dropped from Latin letters only ("Randonnée" is "randonnee").
 *   Elsewhere a combining mark is part of the word — が is not か and योग is
 *   not यग — so it is kept.
 * - Letters, marks and numbers of every script survive; anything else becomes
 *   a single hyphen.
 *
 * The result can be empty (punctuation-only input). An empty key means "no
 * practice stated", and matching never treats two empty keys as the same
 * activity.
 */
export function normalizePracticeKey(practice: string): string {
  return practice
    .normalize('NFKD')
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

interface TimeOption {
  readonly overlap: Interval;
  readonly preferred: boolean;
}

/**
 * `settled`: the time question is answered outright — a fixed appointment, an
 * unknown time, or no fit. `flexible`: one or more overlaps are long enough;
 * which one to show is decided together with equipment in `matchActivity`.
 */
type TimeResult =
  | {
      readonly kind: 'settled';
      readonly reason: MatchReason;
      readonly overlap: Interval | null;
      readonly preferred: boolean;
    }
  | { readonly kind: 'flexible'; readonly options: readonly TimeOption[]; readonly neededMinutes: number };

function settled(reason: MatchReason, overlap: Interval | null = null, preferred = false): TimeResult {
  return { kind: 'settled', reason, overlap, preferred };
}

function evaluateTime(query: ActivityQuery, activity: ActivityDescriptor, zone: string, now: Instant): TimeResult {
  const mandatory = true;
  const wanted = query.availability;
  const timing = activity.timing;

  if (timing.kind === 'unknown') {
    return settled({ criterion: 'time', outcome: 'unknown', mandatory, text: 'No time given yet' });
  }

  if (timing.kind === 'start_only') {
    if (toMs(timing.start) <= toMs(now)) {
      return settled({ criterion: 'time', outcome: 'unmet', mandatory, text: 'Already started' });
    }
    const fitting = wanted.filter(
      (interval) => toMs(interval.start) <= toMs(timing.start) && toMs(timing.start) < toMs(interval.end),
    );
    const label = formatInstant(timing.start, zone);
    // Preferred if *any* fitting interval is preferred, whatever the order.
    return fitting.length === 0
      ? settled({ criterion: 'time', outcome: 'unmet', mandatory, text: `Starts ${label}, outside your times` })
      : settled(
          { criterion: 'time', outcome: 'unknown', mandatory, text: `Starts ${label}; end time not given` },
          null,
          fitting.some((interval) => interval.preferred === true),
        );
  }

  if (timing.kind === 'scheduled') {
    const appointment = timing.appointment;
    const label = formatInterval(appointment, zone);
    if (toMs(appointment.start) <= toMs(now)) {
      return settled({ criterion: 'time', outcome: 'unmet', mandatory, text: `${label} has already started` });
    }
    const covering = wanted.filter((interval) => covers(interval, appointment));
    if (covering.length > 0) {
      // Preferred only if a preferred interval covers the whole appointment;
      // a preferred interval that overlaps part of it does not count.
      return settled(
        { criterion: 'time', outcome: 'met', mandatory, text: `Fixed for ${label}, within your times` },
        appointment,
        covering.some((interval) => interval.preferred === true),
      );
    }
    const partial = wanted.some((interval) => overlapOf(interval, appointment) !== null);
    return settled({
      criterion: 'time',
      outcome: 'unmet',
      mandatory,
      text: partial
        ? `Fixed for ${label}; you are free for only part of it`
        : `Fixed for ${label}, outside your times`,
    });
  }

  const needed = Math.max(timing.durationMinutes, query.minimumMinutes ?? 0);
  const options: TimeOption[] = [];
  let longest = 0;
  for (const window of timing.windows) {
    const ahead = futurePart(window, now);
    if (ahead === null) continue;
    for (const interval of wanted) {
      const overlap = overlapOf(interval, ahead);
      if (overlap === null) continue;
      const minutes = minutesOf(overlap);
      longest = Math.max(longest, minutes);
      if (minutes >= needed) options.push({ overlap, preferred: interval.preferred === true });
    }
  }
  if (options.length === 0) {
    return settled({
      criterion: 'time',
      outcome: 'unmet',
      mandatory,
      text:
        longest > 0
          ? `Your times overlap for at most ${longest} min; it needs ${needed} min`
          : 'No overlap with your times',
    });
  }
  return { kind: 'flexible', options, neededMinutes: needed };
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

function equipmentReason(coverage: EquipmentCoverage, zone: string, fixed: boolean): MatchReason {
  // Missing equipment is shown, never used to hide the activity: people join
  // precisely because they can bring what is missing. While the time is not
  // fixed the wording stays conditional — "if it runs", never "for".
  const when = `${fixed ? 'for' : 'if it runs'} ${formatInterval(coverage.interval, zone)}`;
  if (coverage.complete) {
    return { criterion: 'equipment', outcome: 'info', mandatory: false, text: `Required equipment covered ${when}` };
  }
  const parts = coverage.needs
    .filter((need) => need.required && need.missing > 0)
    .map((need) => `${need.missing} ${need.kind.replace(/_/g, ' ')}`);
  return { criterion: 'equipment', outcome: 'info', mandatory: false, text: `Missing ${when}: ${parts.join(', ')}` };
}

function isoAt(ms: number): Instant {
  return new Date(ms).toISOString();
}

interface Candidate {
  readonly interval: Interval;
  readonly coverage: EquipmentCoverage;
}

/**
 * The activity-length interval inside `overlap` that confirmed equipment
 * covers best.
 *
 * A contribution covers [t, t + D] only when one of its own declared intervals
 * contains it, so coverage can only improve at the overlap's start or at the
 * start of a declared interval: those are the only starts worth trying, and
 * trying all of them finds the best one without a scan. Nothing is extended
 * or stitched together — an interval no single declaration contains is not
 * treated as covered. Ties go to the earliest start.
 */
function bestCandidate(
  overlap: Interval,
  durationMs: number,
  contributions: readonly EquipmentContribution[],
  coverageAt: (interval: Interval) => EquipmentCoverage,
): Candidate {
  const first = toMs(overlap.start);
  const last = toMs(overlap.end) - durationMs;
  const starts = new Set<number>([first]);
  for (const contribution of contributions) {
    if (contribution.status !== 'confirmed') continue;
    for (const declared of contribution.availableDuring ?? []) {
      const start = toMs(declared.start);
      if (start >= first && start <= last) starts.add(start);
    }
  }
  let best: (Candidate & { readonly missing: number }) | null = null;
  for (const start of [...starts].sort((a, b) => a - b)) {
    const interval = { start: isoAt(start), end: isoAt(start + durationMs) };
    const coverage = coverageAt(interval);
    const missing = coverage.needs.reduce((sum, need) => sum + need.missing, 0);
    if (
      best === null ||
      coverage.requiredMissing < best.coverage.requiredMissing ||
      (coverage.requiredMissing === best.coverage.requiredMissing && missing < best.missing)
    ) {
      best = { interval, coverage, missing };
    }
  }
  if (best === null) throw new Error('an overlap always has at least one candidate start');
  return { interval: best.interval, coverage: best.coverage };
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
  const activityPractice = activity.practiceKey === null ? '' : normalizePracticeKey(activity.practiceKey);
  if (wantedPractice === '') {
    reasons.push({ criterion: 'practice', outcome: 'unknown', mandatory: true, text: 'No activity type in the search' });
  } else if (activityPractice === '') {
    reasons.push({ criterion: 'practice', outcome: 'unknown', mandatory: true, text: 'Activity type not stated' });
  } else if (activityPractice === wantedPractice) {
    reasons.push({ criterion: 'practice', outcome: 'met', mandatory: true, text: `Same activity: ${wantedPractice}` });
  } else {
    reasons.push({ criterion: 'practice', outcome: 'unmet', mandatory: true, text: 'Different activity' });
  }

  const time = evaluateTime(query, activity, zone, now);
  const needs = activity.equipment?.needs ?? [];
  const contributions = activity.equipment?.contributions ?? [];
  const participantIds = activeParticipants(activity.participation).ids;
  const coverageAt = (interval: Interval): EquipmentCoverage =>
    equipmentCoverage({
      interval,
      needs,
      contributions,
      participantIds,
      organizerId: activity.participation.organizerId,
    });

  let overlap: Interval | null;
  let candidate: Interval | null;
  let preferred: boolean;
  let equipment: EquipmentCoverage | null = null;
  if (time.kind === 'settled') {
    // A fixed appointment is judged whole: equipment must cover all of it.
    reasons.push(time.reason);
    overlap = time.overlap;
    candidate = time.overlap;
    preferred = time.preferred;
    if (candidate !== null && needs.length > 0) equipment = coverageAt(candidate);
  } else {
    const durationMs = time.neededMinutes * 60_000;
    const options = time.options.map((option) => {
      if (needs.length === 0) {
        const start = toMs(option.overlap.start);
        return { ...option, candidate: { start: option.overlap.start, end: isoAt(start + durationMs) }, coverage: null };
      }
      const best = bestCandidate(option.overlap, durationMs, contributions, coverageAt);
      return { ...option, candidate: best.interval, coverage: best.coverage };
    });
    // Preferred times first, then the overlap where equipment is least short,
    // then the earliest. Equipment only chooses which possible time to show;
    // it never removes the activity.
    options.sort(
      (a, b) =>
        Number(b.preferred) - Number(a.preferred) ||
        (a.coverage?.requiredMissing ?? 0) - (b.coverage?.requiredMissing ?? 0) ||
        toMs(a.candidate.start) - toMs(b.candidate.start) ||
        minutesOf(b.overlap) - minutesOf(a.overlap),
    );
    const chosen = options[0];
    if (chosen === undefined) throw new Error('a flexible time result always has an option');
    reasons.push({
      criterion: 'time',
      outcome: 'met',
      mandatory: true,
      text: `Possible overlap ${formatInterval(chosen.overlap, zone)} (${minutesOf(chosen.overlap)} min) — not confirmed until a time is fixed`,
    });
    overlap = chosen.overlap;
    candidate = chosen.candidate;
    preferred = chosen.preferred;
    equipment = chosen.coverage;
  }

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

  if (equipment !== null) reasons.push(equipmentReason(equipment, zone, time.kind === 'settled'));

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
    overlap,
    overlapIsPreferred: preferred,
    candidate,
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
        Number(b.overlapIsPreferred) - Number(a.overlapIsPreferred) ||
        b.preferencesMet - a.preferencesMet ||
        (a.candidate === null ? 1 : 0) - (b.candidate === null ? 1 : 0) ||
        (a.candidate !== null && b.candidate !== null ? toMs(a.candidate.start) - toMs(b.candidate.start) : 0) ||
        (a.signalId < b.signalId ? -1 : a.signalId > b.signalId ? 1 : 0),
    );
}
