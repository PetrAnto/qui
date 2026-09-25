import { beforeEach, describe, expect, it } from 'vitest';

import {
  blockUser,
  createSignal,
  joinSignal,
  searchActivities,
  type ActivitySearchInput,
  type ActivitySearchView,
  type Ports,
} from '@indenoi/core';
import { CITY_IDS } from '@indenoi/geo';

import { DEMO_USERS, createDemoPorts } from '../src/demo/index';

let ports: Ports;

beforeEach(() => {
  ports = createDemoPorts();
});

/** Demo clock: Sun 16 Aug 2026. Tuesday 18 August is two days later. */
const TUESDAY_AFTERNOON = [{ date: '2026-08-18', part: 'afternoon' as const, preferred: false }];

function input(overrides: Partial<ActivitySearchInput>): ActivitySearchInput {
  return {
    practice: 'climbing',
    geoScopeId: CITY_IDS.lyon,
    slots: TUESDAY_AFTERNOON,
    durationMinutes: 90,
    ...overrides,
  };
}

async function search(viewerId: string, overrides: Partial<ActivitySearchInput> = {}): Promise<ActivitySearchView> {
  const result = await searchActivities(ports, { viewerId, input: input(overrides) });
  if (!result.ok) throw new Error(`search failed: ${result.reason}`);
  return result.value;
}

/** A paddle outing Léa hosts in Ajaccio on Tuesday 18 August at 14:00 local time. */
async function leaPaddle(audience: 'all' | 'adults_only' = 'all'): Promise<string> {
  const created = await createSignal(ports, {
    actorId: DEMO_USERS.lea,
    type: 'join',
    title: 'Paddle round the Sanguinaires',
    body: 'Synthetic test activity.',
    geoScopeId: CITY_IDS.ajaccio,
    practice: 'Paddle',
    startsAt: '2026-08-18T12:00:00.000Z',
    capacity: 6,
    audience,
  });
  if (!created.ok) throw new Error(`setup failed: ${created.reason}`);
  return created.value.signalId;
}

const PADDLE = { practice: 'paddle', geoScopeId: CITY_IDS.ajaccio } as const;
/** Tokyo is not in the curated seed: it comes from the worldwide GeoNames index. */
const TOKYO = 'geo:city:gn-1850147';

describe('activity search against the demo data', () => {
  it('finds an existing activity and is honest that its end time is unknown', async () => {
    const view = await search(DEMO_USERS.lea);
    expect(view.timezone).toBe('Europe/Paris');
    expect(view.results).toHaveLength(1);
    const [result] = view.results;
    expect(result?.card.signal.type).toBe('join');
    expect(result?.match.verdict).toBe('unconfirmed');
    expect(result?.match.reasons.find((reason) => reason.criterion === 'time')).toMatchObject({
      outcome: 'unknown',
      text: 'Starts Tue 16:00; end time not given',
    });
  });

  it('keeps unknown attributes unknown instead of claiming a match', async () => {
    const view = await search(DEMO_USERS.lea, {
      level: { value: 'beginner', mandatory: true },
      freeOnly: { value: true, mandatory: true },
    });
    const outcomes = Object.fromEntries(
      (view.results[0]?.match.reasons ?? []).map((reason) => [reason.criterion, reason.outcome]),
    );
    expect(outcomes).toMatchObject({ level: 'unknown', cost_type: 'unknown' });
    expect(view.results[0]?.match.verdict).toBe('unconfirmed');
  });

  it('returns no results, not an error, when nobody has proposed it', async () => {
    const view = await search(DEMO_USERS.lea, { practice: 'padel', geoScopeId: CITY_IDS.montpellier });
    expect(view.results).toEqual([]);
    // Montpellier's one open activity (urban foraging) was checked and does not fit.
    expect(view.notCompatible).toBe(1);
  });

  it('counts activities that are open but do not fit, without listing them', async () => {
    const view = await search(DEMO_USERS.lea, {
      slots: [{ date: '2026-08-18', part: 'morning', preferred: false }],
    });
    expect(view.results).toEqual([]);
    expect(view.notCompatible).toBe(1);
  });

  it('works in a city with no activity at all, anywhere in the world', async () => {
    const view = await search(DEMO_USERS.lea, { practice: 'ヨガ', geoScopeId: TOKYO });
    expect(view.timezone).toBe('Asia/Tokyo');
    expect(view.results).toEqual([]);
  });

  it('refuses malformed input instead of guessing', async () => {
    for (const bad of [
      input({ practice: '   ' }),
      input({ practice: '!!!' }),
      input({ slots: [] }),
      input({ slots: [{ date: '2026-02-30', part: 'morning', preferred: false }] }),
      input({ durationMinutes: 5 }),
    ]) {
      expect(await searchActivities(ports, { viewerId: DEMO_USERS.lea, input: bad })).toEqual({
        ok: false,
        reason: 'invalid_input',
      });
    }
    expect(
      await searchActivities(ports, { viewerId: DEMO_USERS.lea, input: input({ geoScopeId: 'geo:city:nowhere' }) }),
    ).toEqual({ ok: false, reason: 'not_found' });
  });
});

describe('visibility is applied before matching', () => {
  it('removes a blocked pair from each other’s results, in both directions', async () => {
    const signalId = await leaPaddle();
    expect((await search(DEMO_USERS.hugo, PADDLE)).results.map((r) => r.card.signal.id)).toContain(signalId);

    await blockUser(ports, { actorId: DEMO_USERS.marc, targetId: DEMO_USERS.lea });
    expect((await search(DEMO_USERS.marc, PADDLE)).results).toEqual([]);
    // A block removes the account from the matching altogether: not even counted.
    expect((await search(DEMO_USERS.marc, PADDLE)).notCompatible).toBe(0);
    // A third party is unaffected.
    expect((await search(DEMO_USERS.hugo, PADDLE)).results).toHaveLength(1);
  });

  it('applies the block when the creator is the one who pressed it', async () => {
    await leaPaddle();
    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.marc });
    expect((await search(DEMO_USERS.marc, PADDLE)).results).toEqual([]);
  });

  it('never shows adult-only activities to a minor', async () => {
    const signalId = await leaPaddle('adults_only');
    expect((await search(DEMO_USERS.ines, PADDLE)).results).toEqual([]);
    expect((await search(DEMO_USERS.hugo, PADDLE)).results.map((r) => r.card.signal.id)).toContain(signalId);
  });

  it('carries no participant identities in a result', async () => {
    const signalId = await leaPaddle();
    expect((await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId })).ok).toBe(true);
    const serialised = JSON.stringify(await search(DEMO_USERS.marc, PADDLE));
    expect(serialised).toContain(signalId);
    expect(serialised).not.toContain(DEMO_USERS.hugo);
  });
});

describe('searching publishes nothing and joins nothing', () => {
  it('leaves every piece of state exactly as it was', async () => {
    await leaPaddle();
    const snapshot = async () => ({
      signals: await ports.repo.listSignals(),
      responses: await ports.repo.listResponses(),
      participants: await ports.repo.listParticipants(),
      threads: await ports.repo.listThreads(),
      audit: await ports.repo.listAudit(),
      analytics: await ports.repo.listAnalytics(),
      attachments: await ports.repo.listAttachments(DEMO_USERS.marc),
    });
    const before = JSON.parse(JSON.stringify(await snapshot()));
    const placesBefore = new Set((await ports.repo.listGeoScopes()).map((scope) => scope.id));
    await search(DEMO_USERS.marc, PADDLE);
    await search(DEMO_USERS.marc, { practice: 'padel', geoScopeId: CITY_IDS.montpellier });
    await search(DEMO_USERS.marc, { practice: 'ヨガ', geoScopeId: TOKYO });
    expect(JSON.parse(JSON.stringify(await snapshot()))).toEqual(before);
    // The only thing that may change is public reference data: the worldwide
    // city row the repository caches on first lookup. Nothing about a person.
    const added = (await ports.repo.listGeoScopes()).map((scope) => scope.id).filter((id) => !placesBefore.has(id));
    expect(added.every((id) => id === TOKYO)).toBe(true);
  });
});
