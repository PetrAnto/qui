import { beforeEach, describe, expect, it } from 'vitest';

import {
  blockUser,
  createSignal,
  getProfile,
  getSignalDetail,
  listSignals,
  searchActivities,
  type AccountState,
  type Ports,
} from '@indenoi/core';
import { CITY_IDS } from '@indenoi/geo';

import { DEMO_USERS, createDemoPorts } from '../src/demo/index';

/**
 * INV-SUSPEND-1 in signal discovery: a suspended author's signals disappear
 * for everybody else, a distribution-restricted author keeps their voice but
 * loses amplification, and both still see their own state.
 */

let ports: Ports;
let signalId: string;

beforeEach(async () => {
  ports = createDemoPorts();
  const created = await createSignal(ports, {
    actorId: DEMO_USERS.lea,
    type: 'join',
    title: 'Paddle round the Sanguinaires',
    body: 'Synthetic test activity.',
    geoScopeId: CITY_IDS.ajaccio,
    practice: 'paddle',
    startsAt: '2026-08-18T12:00:00.000Z',
    capacity: 6,
  });
  if (!created.ok) throw new Error(`setup failed: ${created.reason}`);
  signalId = created.value.signalId;
});

async function setState(userId: string, accountState: AccountState): Promise<void> {
  const person = await ports.repo.getPerson(userId);
  if (person === null) throw new Error('missing person');
  await ports.repo.putPerson({ ...person, accountState });
}

async function listedFor(viewerId: string): Promise<boolean> {
  const cards = await listSignals(ports, { viewerId, geoScopeId: CITY_IDS.ajaccio });
  return (cards ?? []).some((card) => card.signal.id === signalId);
}

async function searchFor(viewerId: string, part: 'morning' | 'afternoon') {
  const result = await searchActivities(ports, {
    viewerId,
    input: {
      practice: 'paddle',
      geoScopeId: CITY_IDS.ajaccio,
      slots: [{ date: '2026-08-18', part, preferred: false }],
      durationMinutes: 90,
    },
  });
  if (!result.ok) throw new Error(`search failed: ${result.reason}`);
  return result.value;
}

describe('an active author', () => {
  it('is listed and searchable for another viewer and for themselves', async () => {
    expect(await listedFor(DEMO_USERS.hugo)).toBe(true);
    expect(await listedFor(DEMO_USERS.lea)).toBe(true);
    expect((await searchFor(DEMO_USERS.hugo, 'afternoon')).results.map((r) => r.card.signal.id)).toContain(signalId);
    // Open but not fitting: counted as such — this paddle outing and Léa's
    // seeded freediving event, both hers.
    expect((await searchFor(DEMO_USERS.hugo, 'morning')).notCompatible).toBe(2);
  });
});

for (const state of ['suspended', 'distribution_restricted'] as const) {
  describe(`a ${state} author`, () => {
    beforeEach(async () => {
      await setState(DEMO_USERS.lea, state);
    });

    it('disappears from another viewer’s Signals list', async () => {
      expect(await listedFor(DEMO_USERS.hugo)).toBe(false);
    });

    it('disappears from another viewer’s search, and none of their activities is even counted', async () => {
      expect((await searchFor(DEMO_USERS.hugo, 'afternoon')).results).toEqual([]);
      expect((await searchFor(DEMO_USERS.hugo, 'morning')).notCompatible).toBe(0);
    });

    it('still sees their own signal', async () => {
      expect(await listedFor(DEMO_USERS.lea)).toBe(true);
    });
  });
}

// ---------------------------------------------------------------------------
// Direct access (getSignalDetail): what a link to the signal may show.
// ---------------------------------------------------------------------------

async function detailFor(viewerId: string, id: string = signalId) {
  return getSignalDetail(ports, { viewerId, signalId: id });
}

async function adultsOnlySignal(): Promise<string> {
  const created = await createSignal(ports, {
    actorId: DEMO_USERS.lea,
    type: 'event',
    title: 'Late swim, adults only',
    body: 'Synthetic test activity.',
    geoScopeId: CITY_IDS.ajaccio,
    audience: 'adults_only',
  });
  if (!created.ok) throw new Error(`setup failed: ${created.reason}`);
  return created.value.signalId;
}

describe('direct access to a signal', () => {
  it('hides a suspended author’s signal from another viewer', async () => {
    await setState(DEMO_USERS.lea, 'suspended');
    expect(await detailFor(DEMO_USERS.hugo)).toBeNull();
  });

  it('lets a suspended author still read their own signal', async () => {
    await setState(DEMO_USERS.lea, 'suspended');
    expect((await detailFor(DEMO_USERS.lea))?.signal.id).toBe(signalId);
  });

  it('keeps a distribution-restricted author’s signal readable by direct link', async () => {
    await setState(DEMO_USERS.lea, 'distribution_restricted');
    expect((await detailFor(DEMO_USERS.hugo))?.signal.id).toBe(signalId);
    // …while it stays out of discovery (covered above for list and search).
    expect(await listedFor(DEMO_USERS.hugo)).toBe(false);
  });

  it('hides an adults-only signal from a minor, not from an eligible adult', async () => {
    const id = await adultsOnlySignal();
    expect(await detailFor(DEMO_USERS.ines, id)).toBeNull();
    expect((await detailFor(DEMO_USERS.hugo, id))?.signal.id).toBe(id);
  });

  it('keeps the existing block and removal rules', async () => {
    expect(await detailFor(DEMO_USERS.hugo)).not.toBeNull();
    await blockUser(ports, { actorId: DEMO_USERS.hugo, targetId: DEMO_USERS.lea });
    expect(await detailFor(DEMO_USERS.hugo)).toBeNull();

    const signal = await ports.repo.getSignal(signalId);
    if (signal === null) throw new Error('missing signal');
    await ports.repo.putSignal({ ...signal, state: 'removed' });
    expect(await detailFor(DEMO_USERS.marc)).toBeNull();
    expect(await detailFor(DEMO_USERS.lea)).toBeNull();
  });
});

describe('a person’s profile', () => {
  it('lists an adults-only signal to an adult, never to a minor', async () => {
    const id = await adultsOnlySignal();
    const lea = await ports.repo.getPerson(DEMO_USERS.lea);
    if (lea === null) throw new Error('missing person');
    const forMinor = await getProfile(ports, { viewerId: DEMO_USERS.ines, handle: lea.handle });
    const forAdult = await getProfile(ports, { viewerId: DEMO_USERS.hugo, handle: lea.handle });
    expect(forMinor?.signals.map((signal) => signal.id)).not.toContain(id);
    expect(forAdult?.signals.map((signal) => signal.id)).toContain(id);
  });
});
