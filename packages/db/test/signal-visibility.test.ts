import { beforeEach, describe, expect, it } from 'vitest';

import {
  createSignal,
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
