import { describe, expect, it } from 'vitest';

import {
  buildProposalPreview,
  isLocalDate,
  slotsToAvailability,
  upcomingLocalDates,
  zonedTimeToInstant,
} from '../src/activity/index';

describe('local days and parts of the day become instants in the city’s zone', () => {
  it('converts a Paris summer afternoon and a Tokyo morning', () => {
    expect(zonedTimeToInstant('2026-08-18', 12, 'Europe/Paris')).toBe('2026-08-18T10:00:00.000Z');
    expect(zonedTimeToInstant('2026-08-18', 8, 'Asia/Tokyo')).toBe('2026-08-17T23:00:00.000Z');
  });

  it('handles both sides of a daylight-saving change', () => {
    // Paris: UTC+1 in winter, UTC+2 in summer.
    expect(zonedTimeToInstant('2026-01-10', 8, 'Europe/Paris')).toBe('2026-01-10T07:00:00.000Z');
    // 02:00 does not exist on 29 March 2026 in Paris; it resolves to the first valid instant.
    expect(zonedTimeToInstant('2026-03-29', 2, 'Europe/Paris')).toBe('2026-03-29T01:00:00.000Z');
    // 02:00 happens twice on 25 October 2026; the first occurrence is used.
    expect(zonedTimeToInstant('2026-10-25', 2, 'Europe/Paris')).toBe('2026-10-25T00:00:00.000Z');
  });

  it('builds one interval per slot and keeps the preference', () => {
    expect(
      slotsToAvailability(
        [
          { date: '2026-08-18', part: 'afternoon', preferred: false },
          { date: '2026-08-19', part: 'evening', preferred: true },
        ],
        'Europe/Paris',
      ),
    ).toEqual([
      { start: '2026-08-18T10:00:00.000Z', end: '2026-08-18T16:00:00.000Z' },
      { start: '2026-08-19T16:00:00.000Z', end: '2026-08-19T20:00:00.000Z', preferred: true },
    ]);
  });

  it('offers the days that follow the demo clock in the city, not the server’s', () => {
    // 23:30 UTC on 16 August is already 17 August in Tokyo.
    expect(upcomingLocalDates('2026-08-16T23:30:00.000Z', 'Asia/Tokyo', 2)).toEqual(['2026-08-17', '2026-08-18']);
    expect(upcomingLocalDates('2026-08-16T12:00:00.000Z', 'Europe/Paris', 1)).toEqual(['2026-08-16']);
  });

  it('rejects impossible dates', () => {
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('2026-8-1')).toBe(false);
    expect(isLocalDate('2026-08-18')).toBe(true);
  });
});

describe('the proposal preview', () => {
  const availability = slotsToAvailability(
    [
      { date: '2026-08-19', part: 'morning', preferred: true },
      { date: '2026-08-18', part: 'afternoon', preferred: false },
    ],
    'Europe/Paris',
  );

  it('is built from the search inputs alone, in time order, with no equipment form', () => {
    const preview = buildProposalPreview({
      practice: '  Walk ',
      cityName: 'Marseille',
      timezone: 'Europe/Paris',
      availability,
      durationMinutes: 90,
    });
    expect(preview).toEqual({
      title: 'Walk in Marseille',
      practiceKey: 'walk',
      cityName: 'Marseille',
      timezone: 'Europe/Paris',
      windows: [
        { label: 'Tue 12:00–18:00', preferred: false },
        { label: 'Wed 08:00–12:00', preferred: true },
      ],
      durationMinutes: 90,
      criteria: [],
      equipment: 'none',
      cost: 'not_stated',
      publishable: false,
      notPublishableBecause: 'owner_decision_pending',
    });
  });

  it('keeps required criteria apart from preferences', () => {
    const preview = buildProposalPreview({
      practice: 'Padel',
      cityName: 'Montpellier',
      timezone: 'Europe/Paris',
      availability,
      durationMinutes: 90,
      level: { value: 'intermediate', mandatory: true },
      freeOnly: { value: true, mandatory: false },
    });
    expect(preview.criteria).toEqual([
      { label: 'Level: intermediate', mandatory: true },
      { label: 'Free to take part', mandatory: false },
    ]);
    expect(preview.cost).toBe('free');
    expect(preview.publishable).toBe(false);
  });
});
