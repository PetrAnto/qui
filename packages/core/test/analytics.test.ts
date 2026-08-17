import { describe, expect, it } from 'vitest';

import { ANALYTICS_EVENT_NAMES, buildAnalyticsEvent } from '../src/analytics/events';
import { buildClusterReport } from '../src/analytics/clusters';

const AJACCIO = 'geo:city:ajaccio';
const PARIS = 'geo:city:paris';

function event(
  id: string,
  name: (typeof ANALYTICS_EVENT_NAMES)[number],
  geoScopeId: string,
  extra: { actorId?: string; practice?: string; signalType?: 'ask' | 'offer' | 'join' | 'event'; at?: string } = {},
) {
  return buildAnalyticsEvent(id, {
    name,
    at: extra.at ?? '2026-03-01T10:00:00.000Z',
    actorId: extra.actorId ?? 'u1',
    geoScopeId,
    practice: extra.practice ?? null,
    signalType: extra.signalType ?? null,
  });
}

describe('INV-ANALYTICS-1 the event shape cannot carry sensitive data', () => {
  it('drops anything that is not part of the closed shape', () => {
    const built = buildAnalyticsEvent('e1', {
      name: 'city_added',
      at: '2026-03-01T10:00:00.000Z',
      actorId: 'u1',
      geoScopeId: AJACCIO,
      // @ts-expect-error the shape is closed on purpose
      lat: 41.9,
    });
    expect(Object.keys(built).sort()).toEqual(
      ['actorId', 'at', 'geoScopeId', 'id', 'name', 'practice', 'signalType', 'targetId'].sort(),
    );
    expect(JSON.stringify(built)).not.toContain('41.9');
  });

  it('does not instrument time spent', () => {
    expect(ANALYTICS_EVENT_NAMES.some((name) => /time|dwell|session_length/.test(name))).toBe(false);
  });
});

describe('cluster report', () => {
  const events = [
    // Ajaccio: a small amount of real conversion.
    event('e1', 'discover_impression', AJACCIO),
    event('e2', 'signal_created', AJACCIO, { practice: 'freediving', signalType: 'join' }),
    event('e3', 'signal_response', AJACCIO, { actorId: 'u2', practice: 'freediving', signalType: 'join' }),
    event('e4', 'thread_started', AJACCIO, { signalType: 'ask' }),
    event('e5', 'local_outcome_recorded', AJACCIO, { actorId: 'u2', signalType: 'join' }),
    // Paris: a lot of scrolling and nothing else.
    ...Array.from({ length: 40 }, (_, index) =>
      event(`p${index}`, 'discover_impression', PARIS, { actorId: `paris-${index}` }),
    ),
  ];

  it('ranks conversion above volume', () => {
    const report = buildClusterReport(events);
    expect(report.cities[0]?.geoScopeId).toBe(AJACCIO);
    expect(report.cities[1]?.geoScopeId).toBe(PARIS);
  });

  it('breaks activity down by practice and by signal type', () => {
    const report = buildClusterReport(events);
    expect(report.cityPractices.map((row) => row.practice)).toContain('freediving');
    expect(report.citySignalTypes.map((row) => row.signalType).sort()).toEqual(['ask', 'join']);
  });

  it('counts an actor seen on two days as returning', () => {
    const report = buildClusterReport([
      event('r1', 'content_open', AJACCIO, { actorId: 'u9', at: '2026-03-01T10:00:00.000Z' }),
      event('r2', 'content_open', AJACCIO, { actorId: 'u9', at: '2026-03-02T10:00:00.000Z' }),
      event('r3', 'content_open', AJACCIO, { actorId: 'u8', at: '2026-03-02T10:00:00.000Z' }),
    ]);
    expect(report.cities[0]?.returningUsers).toBe(1);
    expect(report.cities[0]?.activeUsers).toBe(2);
  });

  it('is deterministic', () => {
    expect(buildClusterReport(events)).toEqual(buildClusterReport(events));
  });
});
