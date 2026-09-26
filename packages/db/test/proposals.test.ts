import { beforeEach, describe, expect, it } from 'vitest';

import {
  addCity,
  blockUser,
  closeSignal,
  createSignal,
  describeSignal,
  getSignalDetail,
  joinSignal,
  listSignals,
  publishProposal,
  recordLocalOutcome,
  respondToSignal,
  searchActivities,
  slotsToAvailability,
  type AccountState,
  type ActivitySearchInput,
  type Ports,
} from '@indenoi/core';
import { CITY_IDS } from '@indenoi/geo';

import { DEMO_USERS, createDemoPorts } from '../src/demo/index';

/**
 * Publishing the proposal a search became (ADR-0016, INV-PROPOSAL-1), end to
 * end against the synthetic demo store. Demo clock: Sun 16 Aug 2026.
 */

let ports: Ports;

beforeEach(() => {
  ports = createDemoPorts();
});

const KEY = 'test-key-0001';

const PADDLE: ActivitySearchInput = {
  practice: 'Paddle',
  geoScopeId: CITY_IDS.ajaccio,
  slots: [
    { date: '2026-08-18', part: 'afternoon', preferred: false },
    { date: '2026-08-19', part: 'morning', preferred: true },
  ],
  durationMinutes: 120,
  level: { value: 'intermediate', mandatory: false },
};

async function exploreAjaccio(userId: string = DEMO_USERS.tom): Promise<void> {
  const added = await addCity(ports, { actorId: userId, geoScopeId: CITY_IDS.ajaccio, kind: 'exploring' });
  if (!added.ok) throw new Error(`setup failed: ${added.reason}`);
}

async function publish(input: ActivitySearchInput = PADDLE, actorId: string = DEMO_USERS.tom, proposalKey = KEY) {
  return publishProposal(ports, { actorId, input, proposalKey });
}

async function published(): Promise<string> {
  await exploreAjaccio();
  const result = await publish();
  if (!result.ok) throw new Error(`publish failed: ${result.reason}`);
  return result.value.signalId;
}

async function snapshot() {
  return JSON.parse(
    JSON.stringify({
      signals: await ports.repo.listSignals(),
      participants: await ports.repo.listParticipants(),
      responses: await ports.repo.listResponses(),
      audit: await ports.repo.listAudit(),
      analytics: await ports.repo.listAnalytics(),
      tomPlaces: await ports.repo.listAttachments(DEMO_USERS.tom),
      inesPlaces: await ports.repo.listAttachments(DEMO_USERS.ines),
    }),
  );
}

async function setState(userId: string, accountState: AccountState): Promise<void> {
  const person = await ports.repo.getPerson(userId);
  if (person === null) throw new Error('missing person');
  await ports.repo.putPerson({ ...person, accountState });
}

describe('publishing a proposal', () => {
  it('turns the search inputs into one hostless join, with its windows kept as windows', async () => {
    const id = await published();
    const signal = await ports.repo.getSignal(id);
    expect(signal).toMatchObject({
      type: 'join',
      creatorId: DEMO_USERS.tom,
      hostId: null,
      title: 'Paddle in Ajaccio',
      practice: 'Paddle',
      startsAt: null,
      capacity: null,
      state: 'open',
    });
    expect(signal?.plan).toEqual({
      practiceLabel: 'Paddle',
      timezone: 'Europe/Paris',
      windows: slotsToAvailability(PADDLE.slots, 'Europe/Paris').map((window) => ({
        start: window.start,
        end: window.end,
        preferred: window.preferred === true,
      })),
      durationMinutes: 120,
      level: { value: 'intermediate', mandatory: false },
      freeOnly: null,
      proposalKey: KEY,
    });
    // It expires when its last possible window ends.
    expect(signal?.expiresAt).toBe('2026-08-19T10:00:00.000Z');
  });

  it('keeps a preference a preference, and cost unknown, when matched', async () => {
    const id = await published();
    const signal = await ports.repo.getSignal(id);
    if (signal === null) throw new Error('missing');
    const described = describeSignal(signal, { joinedIds: [], timezone: 'Europe/Paris', now: ports.now() });
    expect(described).toMatchObject({
      timing: { kind: 'proposed', durationMinutes: 120 },
      level: null, // "intermediate, preferably" is not a stated level
      cost: { kind: 'unknown' },
      participation: { organizerParticipates: false, participantIds: [] },
    });
  });

  it('works where nothing matched before, from an exploring tie', async () => {
    await exploreAjaccio();
    const before = await searchActivities(ports, { viewerId: DEMO_USERS.hugo, input: PADDLE });
    expect(before.ok && before.value.results).toEqual([]);
    expect((await publish()).ok).toBe(true);
  });

  it('is idempotent: retries and a double click reach the same single activity', async () => {
    await exploreAjaccio();
    const first = await publish();
    const [second, third] = await Promise.all([publish(), publish()]);
    expect(first).toEqual({ ok: true, value: { signalId: expect.any(String), created: true } });
    const id = first.ok ? first.value.signalId : '';
    for (const retry of [second, third]) expect(retry.ok && retry.value.signalId).toBe(id);
    const all = await ports.repo.listSignals();
    expect(all.filter((signal) => signal.creatorId === DEMO_USERS.tom && signal.plan !== null)).toHaveLength(1);
  });

  it('stays one activity when the first two clicks race each other', async () => {
    await exploreAjaccio();
    const [a, b] = await Promise.all([publish(), publish()]);
    expect(a.ok && b.ok && a.value.signalId === b.value.signalId).toBe(true);
    const all = await ports.repo.listSignals();
    expect(all.filter((signal) => signal.creatorId === DEMO_USERS.tom && signal.plan !== null)).toHaveLength(1);
  });

  it('refuses to reuse a key for different inputs', async () => {
    await exploreAjaccio();
    await publish();
    expect(await publish({ ...PADDLE, durationMinutes: 60 })).toEqual({ ok: false, reason: 'conflict' });
  });
});

describe('refused publications write nothing', () => {
  it('refuses without a tie to the city, and never creates one', async () => {
    const before = await snapshot();
    expect(await publish()).toEqual({ ok: false, reason: 'no_city_attachment' });
    expect(await snapshot()).toEqual(before);
  });

  it('refuses a minor (P6 is not approved)', async () => {
    const before = await snapshot();
    expect(await publish(PADDLE, DEMO_USERS.ines)).toEqual({ ok: false, reason: 'proposal_adults_only' });
    expect(await snapshot()).toEqual(before);
  });

  it('refuses a suspended account', async () => {
    await exploreAjaccio();
    await setState(DEMO_USERS.tom, 'suspended');
    const before = await snapshot();
    expect(await publish()).toEqual({ ok: false, reason: 'account_suspended' });
    expect(await snapshot()).toEqual(before);
  });

  it('refuses malformed input, a bad key, and windows that are already over', async () => {
    await exploreAjaccio();
    const before = await snapshot();
    expect((await publish({ ...PADDLE, practice: '!!!' })).ok).toBe(false);
    expect((await publish(PADDLE, DEMO_USERS.tom, 'BAD KEY')).ok).toBe(false);
    expect(
      (await publish({ ...PADDLE, slots: [{ date: '2026-08-16', part: 'morning', preferred: false }] })).ok,
    ).toBe(false);
    expect(await snapshot()).toEqual(before);
  });
});

describe('discovery goes through the shared visibility policy and the existing matcher', () => {
  it('is listed and matched for another viewer, but cannot be joined', async () => {
    const id = await published();
    const cards = await listSignals(ports, { viewerId: DEMO_USERS.hugo, geoScopeId: CITY_IDS.ajaccio });
    const card = cards?.find((entry) => entry.signal.id === id);
    expect(card?.signal.hostless).toBe(true);
    expect(card?.signal.plan).not.toHaveProperty('proposalKey');
    expect(card?.eligibility).toEqual({ allowed: false, reason: 'awaiting_host' });

    const found = await searchActivities(ports, {
      viewerId: DEMO_USERS.hugo,
      input: { practice: 'paddle', geoScopeId: CITY_IDS.ajaccio, slots: [PADDLE.slots[0]!], durationMinutes: 90 },
    });
    const match = found.ok ? found.value.results.find((result) => result.match.signalId === id) : undefined;
    expect(match?.match.verdict).toBe('compatible');
    expect(match?.match.reasons.find((reason) => reason.criterion === 'time')?.text).toContain('not confirmed');
  });

  it('is not matched outside its windows', async () => {
    const id = await published();
    const found = await searchActivities(ports, {
      viewerId: DEMO_USERS.hugo,
      input: {
        practice: 'paddle',
        geoScopeId: CITY_IDS.ajaccio,
        slots: [{ date: '2026-08-20', part: 'evening', preferred: false }],
        durationMinutes: 90,
      },
    });
    expect(found.ok && found.value.results.some((result) => result.match.signalId === id)).toBe(false);
  });

  it('respects blocks, and a restricted proposer loses amplification but keeps the link', async () => {
    const id = await published();
    await blockUser(ports, { actorId: DEMO_USERS.hugo, targetId: DEMO_USERS.tom });
    const blocked = await listSignals(ports, { viewerId: DEMO_USERS.hugo, geoScopeId: CITY_IDS.ajaccio });
    expect(blocked?.some((card) => card.signal.id === id)).toBe(false);
    expect(await getSignalDetail(ports, { viewerId: DEMO_USERS.hugo, signalId: id })).toBeNull();

    await setState(DEMO_USERS.tom, 'distribution_restricted');
    const listed = await listSignals(ports, { viewerId: DEMO_USERS.marc, geoScopeId: CITY_IDS.ajaccio });
    expect(listed?.some((card) => card.signal.id === id)).toBe(false);
    expect((await getSignalDetail(ports, { viewerId: DEMO_USERS.marc, signalId: id }))?.signal.id).toBe(id);
  });
});

describe('proposing grants nothing', () => {
  it('opens no joining or response path, for anyone', async () => {
    const id = await published();
    for (const actorId of [DEMO_USERS.hugo, DEMO_USERS.ines, DEMO_USERS.marc]) {
      expect(await joinSignal(ports, { actorId, signalId: id })).toEqual({ ok: false, reason: 'awaiting_host' });
      expect(await respondToSignal(ports, { actorId, signalId: id, message: 'Count me in' })).toEqual({
        ok: false,
        reason: 'awaiting_host',
      });
    }
    expect(await ports.repo.listParticipants(id)).toEqual([]);
    expect(await ports.repo.listResponses({ signalId: id })).toEqual([]);
  });

  it('gives the proposer no host power, no participation and no outcome report', async () => {
    const id = await published();
    expect(await closeSignal(ports, { hostId: DEMO_USERS.tom, signalId: id })).toEqual({
      ok: false,
      reason: 'not_host',
    });
    expect((await recordLocalOutcome(ports, { actorId: DEMO_USERS.tom, signalId: id })).ok).toBe(false);
    const detail = await getSignalDetail(ports, { viewerId: DEMO_USERS.tom, signalId: id });
    expect(detail).toMatchObject({ isHost: false, hostPowers: [], viewerJoined: false });
  });

  it('leaves hosted joins exactly as before: an exploring tie still cannot host', async () => {
    await exploreAjaccio();
    const hosted = await createSignal(ports, {
      actorId: DEMO_USERS.tom,
      type: 'join',
      title: 'Hosted paddle',
      body: '',
      geoScopeId: CITY_IDS.ajaccio,
    });
    expect(hosted.ok).toBe(false);
    const byLocal = await createSignal(ports, {
      actorId: DEMO_USERS.lea,
      type: 'join',
      title: 'Hosted paddle',
      body: '',
      geoScopeId: CITY_IDS.ajaccio,
    });
    if (!byLocal.ok) throw new Error('setup failed');
    const signal = await ports.repo.getSignal(byLocal.value.signalId);
    expect(signal).toMatchObject({ hostId: DEMO_USERS.lea, plan: null });
  });
});
