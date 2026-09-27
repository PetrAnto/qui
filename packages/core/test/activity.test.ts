import { describe, expect, it } from 'vitest';

import {
  activeParticipants,
  availabilityFor,
  describeSignal,
  equipmentCoverage,
  formatMoney,
  matchActivities,
  matchActivity,
  normalizePracticeKey,
  perPersonCost,
  remainingPlaces,
  withinBudget,
  type ActivityDescriptor,
  type ActivityQuery,
  type AvailabilityDeclaration,
  type EquipmentContribution,
  type EquipmentNeed,
  type Interval,
} from '../src/activity/index';
import type { Signal } from '../src/types';

/*
 * All three examples happen in Europe/Paris in early October 2026 (UTC+2).
 * Saturday 3, Sunday 4, Tuesday 6 and Thursday 8 October.
 */
const PARIS = 'Europe/Paris';
const NOW = '2026-10-01T08:00:00.000Z';
const DAYS = { sat: '2026-10-03', sun: '2026-10-04', tue: '2026-10-06', thu: '2026-10-08' } as const;

function at(day: keyof typeof DAYS, time: string): string {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return new Date(Date.UTC(...ymd(DAYS[day]), hours - 2, minutes)).toISOString();
}

function ymd(date: string): [number, number, number] {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return [year, month - 1, day];
}

function span(day: keyof typeof DAYS, from: string, to: string): Interval {
  return { start: at(day, from), end: at(day, to) };
}

function activity(overrides: Partial<ActivityDescriptor> & Pick<ActivityDescriptor, 'signalId'>): ActivityDescriptor {
  return {
    geoScopeId: 'geo:city:marseille',
    timezone: PARIS,
    live: true,
    practiceKey: 'walk',
    timing: { kind: 'unknown' },
    capacity: { places: null, counts: 'includes_organizer' },
    participation: { organizerId: 'user-organizer', organizerParticipates: true, participantIds: [] },
    cost: { kind: 'free' },
    level: null,
    equipment: null,
    ...overrides,
  };
}

function legacySignal(overrides: Partial<Signal>): Signal {
  return {
    id: 'sig-legacy',
    creatorId: 'user-host',
    hostId: 'user-host',
    plan: null,
    type: 'join',
    title: 'Walk with Léa Martin from 12 rue des Fleurs',
    body: 'Call Léa on 06 00 00 00 00',
    geoScopeId: 'geo:city:marseille',
    practice: 'Walk',
    linkedPostId: null,
    placeLabel: 'Outside Léa’s house',
    startsAt: null,
    expiresAt: null,
    capacity: null,
    audience: 'all',
    state: 'open',
    createdAt: '2026-09-20T10:00:00.000Z',
    demo: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Example 1 — a flexible free walk
// ---------------------------------------------------------------------------

describe('a flexible free walk in Marseille', () => {
  const query: ActivityQuery = {
    practiceKey: 'Walk',
    geoScopeId: 'geo:city:marseille',
    timezone: PARIS,
    availability: [span('sat', '09:00', '12:00'), { ...span('sun', '15:00', '18:00'), preferred: true }],
    level: { value: 'beginner', mandatory: false },
  };

  const saturday = activity({
    signalId: 'sig-a-saturday',
    timing: { kind: 'proposed', windows: [span('sat', '10:00', '13:00')], durationMinutes: 90 },
    level: 'beginner',
  });
  const sundayPreferred = activity({
    signalId: 'sig-b-sunday',
    timing: { kind: 'proposed', windows: [span('sun', '15:30', '17:30')], durationMinutes: 90 },
  });
  const tooShort = activity({
    signalId: 'sig-c-short',
    timing: { kind: 'proposed', windows: [span('sat', '11:30', '12:30')], durationMinutes: 90 },
  });
  const noOverlap = activity({
    signalId: 'sig-d-evening',
    timing: { kind: 'proposed', windows: [span('sun', '18:00', '20:00')], durationMinutes: 90 },
  });

  it('finds an overlap long enough for the walk, and says it is not an appointment', () => {
    const match = matchActivity(query, saturday, NOW);
    expect(match.verdict).toBe('compatible');
    expect(match.overlap).toEqual(span('sat', '10:00', '12:00'));
    expect(match.candidate).toEqual(span('sat', '10:00', '11:30'));
    expect(match.reasons.find((reason) => reason.criterion === 'time')?.text).toBe(
      'Possible overlap Sat 10:00–12:00 (120 min) — not confirmed until a time is fixed',
    );
    expect(match.reasons.find((reason) => reason.criterion === 'level')).toMatchObject({
      outcome: 'met',
      mandatory: false,
    });
  });

  it('never asks a walk about equipment', () => {
    const match = matchActivity(query, saturday, NOW);
    expect(match.equipment).toBeNull();
    expect(match.reasons.some((reason) => reason.criterion === 'equipment')).toBe(false);
  });

  it('rejects an overlap shorter than the activity, and a window that misses entirely', () => {
    expect(matchActivity(query, tooShort, NOW).reasons.find((r) => r.criterion === 'time')).toMatchObject({
      outcome: 'unmet',
      text: 'Your times overlap for at most 30 min; it needs 90 min',
    });
    expect(matchActivity(query, noOverlap, NOW).verdict).toBe('incompatible');
  });

  it('ranks the preferred time first, then compatible before unknown before incompatible', () => {
    const legacy = describeSignal(legacySignal({ id: 'sig-e-legacy', startsAt: at('sun', '16:00') }), {
      joinedIds: [],
      timezone: PARIS,
      now: NOW,
    });
    if (legacy === null) throw new Error('legacy join not described');
    const ranked = matchActivities(query, [noOverlap, legacy, tooShort, saturday, sundayPreferred], NOW);
    expect(ranked.map((match) => [match.signalId, match.verdict])).toEqual([
      ['sig-b-sunday', 'compatible'],
      ['sig-a-saturday', 'compatible'],
      ['sig-e-legacy', 'unconfirmed'],
      ['sig-c-short', 'incompatible'],
      ['sig-d-evening', 'incompatible'],
    ]);
  });

  it('returns the same order whatever order the activities arrive in', () => {
    const inputs = [noOverlap, tooShort, saturday, sundayPreferred];
    const forward = matchActivities(query, inputs, NOW);
    const backward = matchActivities(query, [...inputs].reverse(), NOW);
    expect(backward).toEqual(forward);
  });

  it('has nothing to match against in an empty city, rather than inventing activity', () => {
    expect(matchActivities(query, [], NOW)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Existing Join / Event signals with no plan
// ---------------------------------------------------------------------------

describe('existing signals without a plan', () => {
  const query: ActivityQuery = {
    practiceKey: 'walk',
    geoScopeId: 'geo:city:marseille',
    timezone: PARIS,
    availability: [span('sun', '15:00', '18:00')],
    budgetPerPerson: { value: { amountMinor: 1000, currency: 'EUR' }, mandatory: true },
    level: { value: 'beginner', mandatory: true },
  };

  it('are kept, with unknown attributes left unknown instead of assumed', () => {
    const described = describeSignal(legacySignal({ startsAt: at('sun', '16:00') }), {
      joinedIds: ['user-a'],
      timezone: PARIS,
      now: NOW,
    });
    if (described === null) throw new Error('not described');
    expect(described).toMatchObject({
      practiceKey: 'walk',
      timing: { kind: 'start_only' },
      cost: { kind: 'unknown' },
      level: null,
      equipment: null,
      participation: { organizerParticipates: null },
      capacity: { counts: 'excludes_organizer' },
    });

    const match = matchActivity(query, described, NOW);
    expect(match.verdict).toBe('unconfirmed');
    const outcomes = Object.fromEntries(match.reasons.map((reason) => [reason.criterion, reason.outcome]));
    expect(outcomes).toMatchObject({ time: 'unknown', budget: 'unknown', level: 'unknown' });
    expect(match.reasons.find((reason) => reason.criterion === 'time')?.text).toBe(
      'Starts Sun 16:00; end time not given',
    );
  });

  it('are still excluded when a fact they do state rules them out', () => {
    const closed = describeSignal(legacySignal({ state: 'closed', startsAt: at('sun', '16:00') }), {
      joinedIds: [],
      timezone: PARIS,
      now: NOW,
    });
    const outside = describeSignal(legacySignal({ startsAt: at('sun', '20:00') }), {
      joinedIds: [],
      timezone: PARIS,
      now: NOW,
    });
    expect(closed === null ? null : matchActivity(query, closed, NOW).verdict).toBe('incompatible');
    expect(outside === null ? null : matchActivity(query, outside, NOW).verdict).toBe('incompatible');
  });

  it('keep the historical capacity meaning: places for people other than the host', () => {
    const described = describeSignal(legacySignal({ capacity: 2 }), {
      joinedIds: ['user-a', 'user-b'],
      timezone: PARIS,
      now: NOW,
    });
    if (described === null) throw new Error('not described');
    expect(remainingPlaces(described.capacity, described.participation)).toBe(0);
    expect(matchActivity(query, described, NOW).reasons.find((r) => r.criterion === 'places')?.text).toBe('Full');
  });

  it('never carry free text or identities into a match result', () => {
    const described = describeSignal(legacySignal({ startsAt: at('sun', '16:00') }), {
      joinedIds: ['user-secret-participant'],
      timezone: PARIS,
      now: NOW,
    });
    if (described === null) throw new Error('not described');
    const serialised = JSON.stringify(matchActivity(query, described, NOW));
    for (const leak of ['Léa', 'rue des Fleurs', '06 00', 'user-host', 'user-secret-participant']) {
      expect(serialised).not.toContain(leak);
    }
  });

  it('ignore Asks and Offers, which are not activities', () => {
    expect(describeSignal(legacySignal({ type: 'ask' }), { joinedIds: [], timezone: PARIS, now: NOW })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Example 2 — paddleboarding with missing equipment
// ---------------------------------------------------------------------------

describe('paddleboarding in Ajaccio with missing equipment', () => {
  const boards: EquipmentNeed = { id: 'need-board', kind: 'board', quantity: 1, per: 'participant', required: true };
  const leashes: EquipmentNeed = { id: 'need-leash', kind: 'leash', quantity: 1, per: 'participant', required: false };
  const needs = [boards, leashes];

  const saturdayAfternoon = span('sat', '14:00', '18:00');
  const sundayMorning = span('sun', '09:00', '12:00');

  const leaOwn: EquipmentContribution = {
    id: 'c-lea-own',
    needId: 'need-board',
    contributorId: 'user-lea',
    use: 'own_use',
    status: 'confirmed',
    quantity: 1,
    availableDuring: [saturdayAfternoon, sundayMorning],
  };
  const leaSpare: EquipmentContribution = {
    id: 'c-lea-spare',
    needId: 'need-board',
    contributorId: 'user-lea',
    use: 'shareable',
    status: 'confirmed',
    quantity: 1,
    availableDuring: [saturdayAfternoon],
  };
  const rentalHut: EquipmentContribution = {
    id: 'c-rental',
    needId: 'need-board',
    contributorId: 'user-eoin',
    use: 'shareable',
    status: 'suggested',
    quantity: 4,
    availableDuring: null,
  };

  const everyone = ['user-eoin', 'user-lea', 'user-marc'];

  function coverage(
    interval: Interval,
    contributions: readonly EquipmentContribution[],
    participantIds: readonly string[] = everyone,
  ) {
    return equipmentCoverage({ interval, needs, contributions, participantIds, organizerId: 'user-eoin' });
  }

  it('counts own-use for its owner, a shareable board for anyone, and a rental suggestion for nothing', () => {
    const sat = coverage(span('sat', '14:30', '16:30'), [leaOwn, leaSpare, rentalHut]);
    expect(sat.needs.find((need) => need.needId === 'need-board')).toMatchObject({
      needed: 3,
      covered: 2,
      missing: 1,
      status: 'partial',
      suggestions: 1,
    });
    expect(sat.requiredMissing).toBe(1);
    expect(sat.complete).toBe(false);
  });

  it('is specific to the interval: a Saturday-only board does not cover Sunday', () => {
    const sun = coverage(span('sun', '09:30', '11:30'), [leaOwn, leaSpare, rentalHut]);
    expect(sun.needs.find((need) => need.needId === 'need-board')).toMatchObject({ covered: 1, missing: 2 });
  });

  it('does not stretch availability when the date moves', () => {
    const pair = ['user-lea', 'user-marc'];
    const before = coverage(span('sat', '14:30', '16:30'), [leaSpare], pair);
    const after = coverage(span('sun', '09:30', '11:30'), [leaSpare], pair);
    expect(before.needs[0]).toMatchObject({ needId: 'need-board', needed: 2, covered: 1 });
    expect(after.needs[0]).toMatchObject({ needId: 'need-board', needed: 2, covered: 0, missing: 2 });
  });

  it('counts nothing from someone who is no longer in the activity', () => {
    const result = coverage(span('sat', '14:30', '16:30'), [leaOwn, leaSpare], ['user-marc']);
    expect(result.needs[0]).toMatchObject({ needId: 'need-board', needed: 1, covered: 0 });
  });

  it('never lets one own-use board, or one contribution listed twice, count twice', () => {
    const greedy = { ...leaOwn, quantity: 3 };
    const result = coverage(span('sat', '14:30', '16:30'), [greedy, greedy]);
    expect(result.needs.find((need) => need.needId === 'need-board')).toMatchObject({ needed: 3, covered: 1 });
  });

  it('shows an offer as pending, not as coverage', () => {
    const marcMaybe: EquipmentContribution = {
      id: 'c-marc-maybe',
      needId: 'need-board',
      contributorId: 'user-marc',
      use: 'own_use',
      status: 'offered',
      quantity: 1,
      availableDuring: null,
    };
    const result = coverage(span('sat', '14:30', '16:30'), [leaOwn, leaSpare, marcMaybe]);
    expect(result.needs.find((need) => need.needId === 'need-board')).toMatchObject({ covered: 2, offered: 1, missing: 1 });
  });

  it('recalculates as people confirm, and as people leave', () => {
    const marcRental: EquipmentContribution = {
      id: 'c-marc-rental',
      needId: 'need-board',
      contributorId: 'user-marc',
      use: 'own_use',
      status: 'confirmed',
      quantity: 1,
      availableDuring: [saturdayAfternoon],
    };
    const slot = span('sat', '14:30', '16:30');
    expect(coverage(slot, [leaOwn, leaSpare, marcRental]).complete).toBe(true);

    // Marc leaves: his board goes with him, and so does his need for one.
    const withoutMarc = coverage(slot, [leaOwn, leaSpare, marcRental], ['user-eoin', 'user-lea']);
    expect(withoutMarc.needs.find((need) => need.needId === 'need-board')).toMatchObject({ needed: 2, covered: 2 });
  });

  it('keeps optional needs visible without blocking completeness', () => {
    const marcRental: EquipmentContribution = {
      id: 'c-marc-rental',
      needId: 'need-board',
      contributorId: 'user-marc',
      use: 'own_use',
      status: 'confirmed',
      quantity: 1,
      availableDuring: [saturdayAfternoon],
    };
    const result = coverage(span('sat', '14:30', '16:30'), [leaOwn, leaSpare, marcRental]);
    expect(result.needs.find((need) => need.needId === 'need-leash')).toMatchObject({ required: false, missing: 3 });
    expect(result.complete).toBe(true);
  });

  it('gives a non-participating organizer no personal need, but lets them lend', () => {
    const eoinLends: EquipmentContribution = {
      id: 'c-eoin-lends',
      needId: 'need-board',
      contributorId: 'user-eoin',
      use: 'shareable',
      status: 'confirmed',
      quantity: 2,
      availableDuring: [saturdayAfternoon],
    };
    const participation = { organizerId: 'user-eoin', organizerParticipates: false, participantIds: ['user-lea', 'user-marc'] };
    const ids = activeParticipants(participation).ids;
    expect(ids).toEqual(['user-lea', 'user-marc']);
    const result = coverage(span('sat', '14:30', '16:30'), [eoinLends], ids);
    expect(result.needs.find((need) => need.needId === 'need-board')).toMatchObject({ needed: 2, covered: 2 });
    expect(remainingPlaces({ places: 3, counts: 'includes_organizer' }, participation)).toBe(1);
  });

  it('keeps the activity discoverable while boards are missing', () => {
    const paddle = activity({
      signalId: 'sig-paddle',
      geoScopeId: 'geo:city:ajaccio',
      practiceKey: 'paddle',
      timing: { kind: 'proposed', windows: [saturdayAfternoon, sundayMorning], durationMinutes: 120 },
      participation: { organizerId: 'user-eoin', organizerParticipates: true, participantIds: ['user-lea', 'user-marc'] },
      equipment: { needs, contributions: [leaOwn, leaSpare, rentalHut] },
    });
    const match = matchActivity(
      {
        practiceKey: 'Paddle',
        geoScopeId: 'geo:city:ajaccio',
        timezone: PARIS,
        availability: [span('sun', '09:00', '11:30')],
      },
      paddle,
      NOW,
    );
    expect(match.verdict).toBe('compatible');
    expect(match.equipment?.requiredMissing).toBe(2);
    expect(match.reasons.find((reason) => reason.criterion === 'equipment')).toMatchObject({
      outcome: 'info',
      mandatory: false,
      text: 'Missing if it runs Sun 09:00–11:00: 2 board',
    });
  });
});

// ---------------------------------------------------------------------------
// Example 3 — players for a shared padel court
// ---------------------------------------------------------------------------

describe('finding players for a shared padel court in Montpellier', () => {
  const court: EquipmentNeed = { id: 'need-court', kind: 'court_reservation', quantity: 1, per: 'activity', required: true };
  const rackets: EquipmentNeed = { id: 'need-racket', kind: 'racket', quantity: 1, per: 'participant', required: false };
  const appointment = span('thu', '19:30', '21:00');

  const participation = {
    organizerId: 'user-nour',
    organizerParticipates: true,
    participantIds: ['user-noa', 'user-p3'],
  };

  const padel = activity({
    signalId: 'sig-padel',
    geoScopeId: 'geo:city:montpellier',
    practiceKey: 'padel',
    timing: {
      kind: 'proposed',
      windows: [span('tue', '19:00', '22:00'), span('thu', '18:00', '21:00')],
      durationMinutes: 90,
    },
    capacity: { places: 4, counts: 'includes_organizer' },
    participation,
    cost: { kind: 'estimated', amount: { amountMinor: 3600, currency: 'EUR' }, per: 'activity', splitAmong: 4 },
    level: 'intermediate',
    equipment: { needs: [court, rackets], contributions: [] },
  });

  const query: ActivityQuery = {
    practiceKey: 'padel',
    geoScopeId: 'geo:city:montpellier',
    timezone: PARIS,
    availability: [span('thu', '19:30', '21:30')],
    level: { value: 'intermediate', mandatory: true },
    costType: { value: 'free_only', mandatory: false },
    budgetPerPerson: { value: { amountMinor: 1000, currency: 'EUR' }, mandatory: true },
  };

  it('matches the fourth player, and is honest that the court costs money', () => {
    const match = matchActivity(query, padel, NOW);
    expect(match.verdict).toBe('compatible');
    expect(match.placesLeft).toBe(1);
    const text = Object.fromEntries(match.reasons.map((reason) => [reason.criterion, reason.text]));
    expect(text).toMatchObject({
      time: 'Possible overlap Thu 19:30–21:00 (90 min) — not confirmed until a time is fixed',
      level: 'Level intermediate ✓',
      budget: '≈ €9 each (your limit €10)',
      cost_type: 'Shared cost ≈ €9 each (you asked for free)',
      places: '1 place left',
    });
  });

  it('excludes it when "free only" or a lower budget is mandatory', () => {
    expect(matchActivity({ ...query, costType: { value: 'free_only', mandatory: true } }, padel, NOW).verdict).toBe(
      'incompatible',
    );
    const tight = matchActivity(
      { ...query, budgetPerPerson: { value: { amountMinor: 800, currency: 'EUR' }, mandatory: true } },
      padel,
      NOW,
    );
    expect(tight.verdict).toBe('incompatible');
    expect(tight.reasons.find((reason) => reason.criterion === 'budget')?.text).toBe('≈ €9 each (your limit €8)');
  });

  it('never lets an unknown or foreign-currency cost satisfy a mandatory budget', () => {
    expect(withinBudget({ kind: 'unknown' }, { amountMinor: 1000, currency: 'EUR' })).toBe('unknown');
    expect(
      withinBudget(
        { kind: 'known', amount: { amountMinor: 500, currency: 'GBP' }, per: 'person' },
        { amountMinor: 1000, currency: 'EUR' },
      ),
    ).toBe('unknown');
    expect(
      perPersonCost({ kind: 'estimated', amount: { amountMinor: 3600, currency: 'EUR' }, per: 'activity', splitAmong: null }),
    ).toEqual({ status: 'unknown', why: 'split_unknown' });
    const unknownCost = matchActivity(query, { ...padel, cost: { kind: 'unknown' } }, NOW);
    expect(unknownCost.verdict).toBe('unconfirmed');
  });

  it('distinguishes a known price from an estimate', () => {
    const known = matchActivity(
      query,
      { ...padel, cost: { kind: 'known', amount: { amountMinor: 900, currency: 'EUR' }, per: 'person' } },
      NOW,
    );
    expect(known.reasons.find((reason) => reason.criterion === 'budget')?.text).toBe('€9 each (your limit €10)');
  });

  it('is full once the fourth player is in, the organizer counted exactly once', () => {
    const full = { ...participation, participantIds: ['user-noa', 'user-p3', 'user-p4', 'user-nour'] };
    expect(activeParticipants(full).ids).toHaveLength(4);
    expect(remainingPlaces({ places: 4, counts: 'includes_organizer' }, full)).toBe(0);
    expect(matchActivity(query, { ...padel, participation: full }, NOW).verdict).toBe('incompatible');
  });

  it('does not treat "I can book the court" as a reservation', () => {
    const canBook: EquipmentContribution = {
      id: 'c-noa-can-book',
      needId: 'need-court',
      contributorId: 'user-noa',
      use: 'shareable',
      status: 'offered',
      quantity: 1,
      availableDuring: [span('thu', '18:00', '21:00')],
    };
    const offered = equipmentCoverage({
      interval: appointment,
      needs: [court],
      contributions: [canBook],
      participantIds: activeParticipants(participation).ids,
      organizerId: 'user-nour',
    });
    expect(offered.needs[0]).toMatchObject({ covered: 0, offered: 1, missing: 1 });
    expect(offered.complete).toBe(false);

    const booked = { ...canBook, id: 'c-noa-booked', status: 'confirmed' as const, availableDuring: [appointment] };
    const confirmed = equipmentCoverage({
      interval: appointment,
      needs: [court],
      contributions: [booked],
      participantIds: activeParticipants(participation).ids,
      organizerId: 'user-nour',
    });
    expect(confirmed.complete).toBe(true);
    // A booking for Thursday is not a booking for Tuesday.
    const tuesday = equipmentCoverage({
      interval: span('tue', '19:30', '21:00'),
      needs: [court],
      contributions: [booked],
      participantIds: activeParticipants(participation).ids,
      organizerId: 'user-nour',
    });
    expect(tuesday.complete).toBe(false);
  });

  it('requires availability for the whole fixed appointment', () => {
    const scheduled = { ...padel, timing: { kind: 'scheduled' as const, appointment } };
    expect(matchActivity(query, scheduled, NOW).verdict).toBe('compatible');
    const late = matchActivity({ ...query, availability: [span('thu', '20:00', '22:00')] }, scheduled, NOW);
    expect(late.verdict).toBe('incompatible');
    expect(late.reasons.find((reason) => reason.criterion === 'time')?.text).toBe(
      'Fixed for Thu 19:30–21:00; you are free for only part of it',
    );
  });

  it('re-checks each participant against what they declared when the date changes', () => {
    const declarations: AvailabilityDeclaration[] = [
      { userId: 'user-nour', timezone: PARIS, intervals: [span('tue', '19:00', '22:00'), span('thu', '19:00', '21:00')] },
      { userId: 'user-noa', timezone: PARIS, intervals: [span('thu', '18:00', '21:00')] },
      { userId: 'user-p3', timezone: PARIS, intervals: [span('thu', '19:30', '21:30')] },
    ];
    const everyone = [...activeParticipants(participation).ids, 'user-p4'];

    expect(availabilityFor({ kind: 'appointment', interval: appointment }, everyone, declarations)).toEqual([
      { userId: 'user-noa', status: 'available' },
      { userId: 'user-nour', status: 'available' },
      { userId: 'user-p3', status: 'available' },
      { userId: 'user-p4', status: 'not_declared' },
    ]);

    // Moving to Tuesday confirms nobody who did not say Tuesday.
    expect(
      availabilityFor({ kind: 'appointment', interval: span('tue', '19:30', '21:00') }, everyone, declarations),
    ).toEqual([
      { userId: 'user-noa', status: 'unavailable' },
      { userId: 'user-nour', status: 'available' },
      { userId: 'user-p3', status: 'unavailable' },
      { userId: 'user-p4', status: 'not_declared' },
    ]);

    // Before a time is fixed, a long-enough overlap with a window is enough.
    expect(
      availabilityFor(
        { kind: 'window', interval: span('thu', '18:00', '21:00'), minMinutes: 90 },
        ['user-p3'],
        declarations,
      ),
    ).toEqual([{ userId: 'user-p3', status: 'available' }]);
  });
});

// ---------------------------------------------------------------------------
// Worldwide and deterministic
// ---------------------------------------------------------------------------

describe('time zones and formatting', () => {
  it('explains times in the zone the activity happens in, wherever the searcher is', () => {
    const tokyo = activity({
      signalId: 'sig-tokyo',
      geoScopeId: 'geo:city:tokyo',
      timezone: 'Asia/Tokyo',
      timing: {
        kind: 'proposed',
        windows: [{ start: '2026-10-03T00:00:00.000Z', end: '2026-10-03T03:00:00.000Z' }],
        durationMinutes: 60,
      },
    });
    const match = matchActivity(
      {
        practiceKey: 'walk',
        geoScopeId: 'geo:city:tokyo',
        timezone: PARIS,
        availability: [{ start: '2026-10-03T01:00:00.000Z', end: '2026-10-03T02:30:00.000Z' }],
      },
      tokyo,
      NOW,
    );
    expect(match.reasons.find((reason) => reason.criterion === 'time')?.text).toBe(
      'Possible overlap Sat 10:00–11:30 (90 min) — not confirmed until a time is fixed',
    );
  });

  it('normalises practice names and currency formatting', () => {
    expect(normalizePracticeKey('  Paddle Board ')).toBe('paddle-board');
    expect(normalizePracticeKey('Randonnée')).toBe('randonnee');
    expect(formatMoney({ amountMinor: 950, currency: 'EUR' })).toBe('€9.50');
    expect(formatMoney({ amountMinor: 1200, currency: 'JPY' })).toContain('1,200');
  });

  it('ignores windows that are already over', () => {
    const past = activity({
      signalId: 'sig-past',
      timing: { kind: 'proposed', windows: [span('sat', '10:00', '13:00')], durationMinutes: 60 },
    });
    const later = '2026-10-03T10:30:00.000Z'; // Sat 12:30 in Paris
    const match = matchActivity(
      { practiceKey: 'walk', geoScopeId: 'geo:city:marseille', timezone: PARIS, availability: [span('sat', '09:00', '13:00')] },
      past,
      later,
    );
    expect(match.verdict).toBe('incompatible');
  });
});

// ---------------------------------------------------------------------------
// Review round on b904670: R3 — equipment is checked against a
// duration-length candidate interval, not the whole flexible overlap.
// ---------------------------------------------------------------------------

describe('R3 — equipment for a flexible window', () => {
  const board: EquipmentNeed = { id: 'need-board', kind: 'board', quantity: 1, per: 'participant', required: true };
  const court: EquipmentNeed = { id: 'need-court', kind: 'court_reservation', quantity: 1, per: 'activity', required: true };
  const participation = { organizerId: 'user-a', organizerParticipates: true, participantIds: [] };

  function confirmed(id: string, needId: string, interval: Interval, use: 'own_use' | 'shareable' = 'own_use'): EquipmentContribution {
    return { id, needId, contributorId: 'user-a', use, status: 'confirmed', quantity: 1, availableDuring: [interval] };
  }

  function proposal(needs: EquipmentNeed[], contributions: EquipmentContribution[]) {
    return activity({
      signalId: 'sig-r3',
      geoScopeId: 'geo:city:ajaccio',
      practiceKey: 'paddle',
      timing: { kind: 'proposed', windows: [span('sat', '14:00', '18:00')], durationMinutes: 120 },
      participation,
      equipment: { needs, contributions },
    });
  }

  const search: ActivityQuery = {
    practiceKey: 'paddle',
    geoScopeId: 'geo:city:ajaccio',
    timezone: PARIS,
    availability: [span('sat', '14:00', '18:00')],
  };

  it('finds the later two-hour interval the confirmed equipment covers', () => {
    const match = matchActivity(search, proposal([board], [confirmed('c1', 'need-board', span('sat', '15:00', '17:00'))]), NOW);
    expect(match.verdict).toBe('compatible');
    expect(match.overlap).toEqual(span('sat', '14:00', '18:00'));
    expect(match.candidate).toEqual(span('sat', '15:00', '17:00'));
    expect(match.equipment?.complete).toBe(true);
    expect(match.reasons.find((reason) => reason.criterion === 'equipment')?.text).toBe(
      'Required equipment covered if it runs Sat 15:00–17:00',
    );
    // A candidate is not an appointment.
    expect(match.reasons.find((reason) => reason.criterion === 'time')?.text).toContain('not confirmed');
  });

  it('uses the interval where several declarations intersect', () => {
    const match = matchActivity(
      search,
      proposal(
        [board, court],
        [
          confirmed('c1', 'need-board', span('sat', '15:00', '18:00')),
          confirmed('c2', 'need-court', span('sat', '14:30', '17:00'), 'shareable'),
        ],
      ),
      NOW,
    );
    expect(match.candidate).toEqual(span('sat', '15:00', '17:00'));
    expect(match.equipment?.complete).toBe(true);
  });

  it('never invents availability that no single declaration gives', () => {
    const tooShort = matchActivity(search, proposal([board], [confirmed('c1', 'need-board', span('sat', '15:00', '16:30'))]), NOW);
    expect(tooShort.equipment?.complete).toBe(false);
    expect(tooShort.verdict).toBe('compatible'); // still discoverable
    expect(tooShort.candidate).toEqual(span('sat', '14:00', '16:00'));
  });

  it('keeps the full-appointment rule once a time is fixed', () => {
    const scheduled = {
      ...proposal([board], [confirmed('c1', 'need-board', span('sat', '15:00', '17:00'))]),
      timing: { kind: 'scheduled' as const, appointment: span('sat', '14:30', '16:30') },
    };
    const match = matchActivity(search, scheduled, NOW);
    expect(match.candidate).toEqual(span('sat', '14:30', '16:30'));
    expect(match.equipment?.complete).toBe(false);
    expect(match.reasons.find((reason) => reason.criterion === 'equipment')?.text).toBe(
      'Missing for Sat 14:30–16:30: 1 board',
    );
  });
});

// ---------------------------------------------------------------------------
// Review 5320398217, thread 4106808157 (P2): practice keys keep non-Latin
// letters, and an empty key never matches.
// ---------------------------------------------------------------------------

describe('P2 — Unicode practice keys', () => {
  const tokyo = (practiceKey: string | null) =>
    activity({
      signalId: 'sig-unicode',
      geoScopeId: 'geo:city:tokyo',
      timezone: 'Asia/Tokyo',
      practiceKey,
      timing: { kind: 'unknown' },
    });
  const ask = (practiceKey: string): ActivityQuery => ({
    practiceKey,
    geoScopeId: 'geo:city:tokyo',
    timezone: 'Asia/Tokyo',
    availability: [],
  });
  const practiceOutcome = (query: string, activityKey: string | null) =>
    matchActivity(ask(query), tokyo(activityKey), NOW).reasons.find((reason) => reason.criterion === 'practice')?.outcome;

  it('keeps distinct Japanese practices distinct', () => {
    expect(normalizePracticeKey('ヨガ')).not.toBe('');
    expect(normalizePracticeKey('ヨガ')).not.toBe(normalizePracticeKey('水泳'));
    expect(practiceOutcome('ヨガ', '水泳')).toBe('unmet');
  });

  it('matches the same non-Latin practice', () => {
    expect(practiceOutcome('ヨガ', 'ヨガ')).toBe('met');
    expect(practiceOutcome('योग', 'योग')).toBe('met');
  });

  it('keeps combining marks that distinguish non-Latin words', () => {
    // が and か differ only by a combining voiced mark; योग and यग only by a vowel sign.
    expect(normalizePracticeKey('が')).not.toBe(normalizePracticeKey('か'));
    expect(normalizePracticeKey('योग')).not.toBe(normalizePracticeKey('यग'));
  });

  it('treats canonically equivalent spellings as one key', () => {
    expect(normalizePracticeKey('が')).toBe(normalizePracticeKey('が')); // composed vs decomposed が
    expect(normalizePracticeKey('Randonnée')).toBe(normalizePracticeKey('Randonnée'));
    expect(practiceOutcome('が', 'が')).toBe('met');
  });

  it('never reports two empty keys as the same activity', () => {
    expect(normalizePracticeKey('!!!')).toBe('');
    expect(practiceOutcome('!!!', '???')).not.toBe('met');
    expect(practiceOutcome('', 'walk')).not.toBe('met');
    expect(practiceOutcome('walk', '')).not.toBe('met');
  });

  it('keeps the intended Latin normalisation', () => {
    expect(normalizePracticeKey('  Paddle Board ')).toBe('paddle-board');
    expect(normalizePracticeKey('Randonnée')).toBe('randonnee');
    expect(normalizePracticeKey('ＹＯＧＡ')).toBe('yoga');
  });
});

// ---------------------------------------------------------------------------
// Review 5320398217, thread 4106808164 (P2): preference comes from any
// preferred interval that covers the time, whatever the input order.
// ---------------------------------------------------------------------------

describe('P2 — preferred availability is order-independent', () => {
  const appointment = span('sat', '10:30', '11:30');
  const scheduled = activity({ signalId: 'sig-fixed', timing: { kind: 'scheduled', appointment } });
  const wide = span('sat', '09:00', '17:00');
  const preferredCover = { ...span('sat', '10:00', '12:00'), preferred: true };
  const preferredPartial = { ...span('sat', '11:00', '12:00'), preferred: true };
  const query = (availability: ActivityQuery['availability']): ActivityQuery => ({
    practiceKey: 'walk',
    geoScopeId: 'geo:city:marseille',
    timezone: PARIS,
    availability,
  });

  it('marks a fixed appointment preferred when a preferred interval covers it, in either order', () => {
    expect(matchActivity(query([wide, preferredCover]), scheduled, NOW).overlapIsPreferred).toBe(true);
    expect(matchActivity(query([preferredCover, wide]), scheduled, NOW).overlapIsPreferred).toBe(true);
  });

  it('does not count a preferred interval that covers only part of the appointment', () => {
    const match = matchActivity(query([wide, preferredPartial]), scheduled, NOW);
    expect(match.verdict).toBe('compatible');
    expect(match.overlapIsPreferred).toBe(false);
  });

  it('applies the same rule to a start-only signal', () => {
    const startOnly = activity({ signalId: 'sig-start', timing: { kind: 'start_only', start: at('sat', '10:30') } });
    expect(matchActivity(query([wide, preferredCover]), startOnly, NOW).overlapIsPreferred).toBe(true);
    expect(matchActivity(query([preferredCover, wide]), startOnly, NOW).overlapIsPreferred).toBe(true);
    const later = { ...span('sat', '11:00', '12:00'), preferred: true };
    expect(matchActivity(query([wide, later]), startOnly, NOW).overlapIsPreferred).toBe(false);
  });
});
