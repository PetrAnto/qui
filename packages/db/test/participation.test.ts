import { beforeEach, describe, expect, it } from 'vitest';

import {
  blockUser,
  closeSignal,
  createSignal,
  decideResponse,
  joinSignal,
  recordLocalOutcome,
  removeParticipant,
  respondToSignal,
  type Ports,
  type SignalType,
} from '@indenoi/core';
import { CITY_IDS } from '@indenoi/geo';

import { DEMO_USERS, createDemoPorts } from '../src/demo/index';

let ports: Ports;

beforeEach(() => {
  ports = createDemoPorts();
});

async function hostedSignal(type: SignalType, capacity: number | null = null): Promise<string> {
  const created = await createSignal(ports, {
    actorId: DEMO_USERS.lea,
    type,
    title: `A ${type} in Ajaccio`,
    body: 'Synthetic test signal.',
    geoScopeId: CITY_IDS.ajaccio,
    capacity,
  });
  if (!created.ok) throw new Error(`setup failed: ${created.reason}`);
  return created.value.signalId;
}

async function respond(signalId: string, actorId: string): Promise<string> {
  const response = await respondToSignal(ports, { actorId, signalId, message: 'Count me in.' });
  if (!response.ok) throw new Error(`respond failed: ${response.reason}`);
  return response.value.responseId;
}

/** Everything a decision could have written, so a refusal can be shown to write nothing. */
async function snapshot(signalId: string) {
  const [responses, participants, threads, audit, analytics] = await Promise.all([
    ports.repo.listResponses({ signalId }),
    ports.repo.listParticipants(signalId),
    ports.repo.listThreads(),
    ports.repo.listAudit(),
    ports.repo.listAnalytics(),
  ]);
  return {
    responses: responses.map((entry) => ({ ...entry })),
    participants: participants.map((entry) => ({ ...entry })),
    threads: threads.length,
    audit: audit.length,
    analytics: analytics.length,
  };
}

async function joinedIds(signalId: string): Promise<string[]> {
  const participants = await ports.repo.listParticipants(signalId);
  return participants.filter((entry) => entry.state === 'joined').map((entry) => entry.userId);
}

describe('accepting a response into a group activity', () => {
  it('refuses when the activity is full, and writes nothing', async () => {
    const signalId = await hostedSignal('join', 1);
    const responseId = await respond(signalId, DEMO_USERS.hugo);
    expect((await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId })).ok).toBe(true);

    const before = await snapshot(signalId);
    const decision = await decideResponse(ports, {
      hostId: DEMO_USERS.lea,
      responseId,
      decision: 'accepted',
    });

    expect(decision).toEqual({ ok: false, reason: 'signal_full' });
    expect(await snapshot(signalId)).toEqual(before);
    expect(await joinedIds(signalId)).toEqual([DEMO_USERS.marc]);
  });

  it('refuses when the activity is no longer open, and writes nothing', async () => {
    const signalId = await hostedSignal('event', 5);
    const responseId = await respond(signalId, DEMO_USERS.hugo);
    expect((await closeSignal(ports, { hostId: DEMO_USERS.lea, signalId })).ok).toBe(true);

    const before = await snapshot(signalId);
    const decision = await decideResponse(ports, {
      hostId: DEMO_USERS.lea,
      responseId,
      decision: 'accepted',
    });

    expect(decision).toEqual({ ok: false, reason: 'signal_not_open' });
    expect(await snapshot(signalId)).toEqual(before);
  });

  it('refuses after a block between host and responder, and writes nothing', async () => {
    const signalId = await hostedSignal('join', 4);
    const responseId = await respond(signalId, DEMO_USERS.hugo);
    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.hugo });

    const before = await snapshot(signalId);
    const decision = await decideResponse(ports, {
      hostId: DEMO_USERS.lea,
      responseId,
      decision: 'accepted',
    });

    expect(decision).toEqual({ ok: false, reason: 'blocked' });
    expect(await snapshot(signalId)).toEqual(before);
  });

  it('refuses a person the host excluded from this object', async () => {
    const signalId = await hostedSignal('join', 4);
    const responseId = await respond(signalId, DEMO_USERS.hugo);
    await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId });
    await removeParticipant(ports, {
      hostId: DEMO_USERS.lea,
      signalId,
      userId: DEMO_USERS.hugo,
      exclude: true,
    });

    const decision = await decideResponse(ports, {
      hostId: DEMO_USERS.lea,
      responseId,
      decision: 'accepted',
    });
    expect(decision).toEqual({ ok: false, reason: 'host_excluded' });
    expect(await joinedIds(signalId)).toEqual([]);
  });

  it('accepts within capacity, and a repeat acceptance changes nothing', async () => {
    const signalId = await hostedSignal('join', 2);
    const responseId = await respond(signalId, DEMO_USERS.hugo);

    const first = await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' });
    expect(first).toEqual({ ok: true, value: { threadId: null } });
    expect(await joinedIds(signalId)).toEqual([DEMO_USERS.hugo]);

    const before = await snapshot(signalId);
    const again = await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' });
    expect(again).toEqual({ ok: true, value: { threadId: null } });
    expect(await snapshot(signalId)).toEqual(before);
  });

  it('does not count a responder who already joined directly against the capacity', async () => {
    const signalId = await hostedSignal('join', 1);
    const responseId = await respond(signalId, DEMO_USERS.hugo);
    expect((await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId })).ok).toBe(true);

    const decision = await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' });
    expect(decision.ok).toBe(true);
    expect(await joinedIds(signalId)).toEqual([DEMO_USERS.hugo]);
  });

  it('refuses to accept a withdrawn response or to decline an accepted one', async () => {
    const signalId = await hostedSignal('join', 4);
    const withdrawnId = await respond(signalId, DEMO_USERS.hugo);
    const withdrawn = await ports.repo.getResponse(withdrawnId);
    if (withdrawn === null) throw new Error('setup failed');
    await ports.repo.putResponse({ ...withdrawn, state: 'withdrawn' });
    expect(
      await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId: withdrawnId, decision: 'accepted' }),
    ).toEqual({ ok: false, reason: 'conflict' });

    const acceptedId = await respond(signalId, DEMO_USERS.marc);
    await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId: acceptedId, decision: 'accepted' });
    expect(
      await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId: acceptedId, decision: 'declined' }),
    ).toEqual({ ok: false, reason: 'conflict' });
    expect(await joinedIds(signalId)).toEqual([DEMO_USERS.marc]);
  });
});

describe('joining directly', () => {
  it('refuses when full, and a repeat join neither duplicates nor re-counts', async () => {
    const signalId = await hostedSignal('event', 1);
    expect(await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId })).toEqual({
      ok: true,
      value: { signalId },
    });

    const before = await snapshot(signalId);
    expect(await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId })).toEqual({
      ok: true,
      value: { signalId },
    });
    expect(await snapshot(signalId)).toEqual(before);

    expect(await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId })).toEqual({
      ok: false,
      reason: 'signal_full',
    });
    expect(await snapshot(signalId)).toEqual(before);
  });
});

describe('accepting a response to an Ask or Offer', () => {
  it('checks the private-thread rule before marking the response accepted', async () => {
    const signalId = await hostedSignal('ask');
    const responseId = await respond(signalId, DEMO_USERS.hugo);
    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.hugo });

    const before = await snapshot(signalId);
    const decision = await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' });
    expect(decision).toEqual({ ok: false, reason: 'blocked' });
    expect(await snapshot(signalId)).toEqual(before);
  });

  it('opens exactly one thread, however many times the host says yes', async () => {
    const signalId = await hostedSignal('offer');
    const responseId = await respond(signalId, DEMO_USERS.hugo);

    const first = await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' });
    if (!first.ok || first.value.threadId === null) throw new Error('thread not opened');
    const before = await snapshot(signalId);

    const again = await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' });
    expect(again).toEqual({ ok: true, value: { threadId: first.value.threadId } });
    expect(await snapshot(signalId)).toEqual(before);
  });
});

describe('reporting that it actually happened', () => {
  async function outcomeEvents(): Promise<number> {
    const events = await ports.repo.listAnalytics();
    return events.filter((event) => event.name === 'local_outcome_recorded').length;
  }

  it('refuses an account with nothing to do with the signal, and records nothing', async () => {
    const signalId = await hostedSignal('event', 5);
    const before = await outcomeEvents();
    expect(await recordLocalOutcome(ports, { actorId: DEMO_USERS.tom, signalId })).toEqual({
      ok: false,
      reason: 'not_participant',
    });
    expect(await outcomeEvents()).toBe(before);
  });

  it('refuses a pending responder and a removed participant', async () => {
    const signalId = await hostedSignal('join', 5);
    await respond(signalId, DEMO_USERS.hugo);
    await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId });
    await removeParticipant(ports, {
      hostId: DEMO_USERS.lea,
      signalId,
      userId: DEMO_USERS.marc,
      exclude: false,
    });

    expect((await recordLocalOutcome(ports, { actorId: DEMO_USERS.hugo, signalId })).ok).toBe(false);
    expect((await recordLocalOutcome(ports, { actorId: DEMO_USERS.marc, signalId })).ok).toBe(false);
  });

  it('still accepts the host, a joined participant and an accepted responder', async () => {
    const group = await hostedSignal('event', 5);
    await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: group });
    const offer = await hostedSignal('offer');
    const responseId = await respond(offer, DEMO_USERS.hugo);
    await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' });

    const before = await outcomeEvents();
    for (const [actorId, signalId] of [
      [DEMO_USERS.lea, group],
      [DEMO_USERS.marc, group],
      [DEMO_USERS.hugo, offer],
    ] as const) {
      expect(await recordLocalOutcome(ports, { actorId, signalId })).toEqual({
        ok: true,
        value: { recorded: true },
      });
    }
    expect(await outcomeEvents()).toBe(before + 3);
  });
});

// ---------------------------------------------------------------------------
// Review round on b904670: R1 (outcome after removal) and R2 (membership
// must not bypass current eligibility).
// ---------------------------------------------------------------------------

function reasonOf(result: { ok: boolean; reason?: string }): string | undefined {
  return result.ok ? undefined : result.reason;
}

async function suspend(userId: string): Promise<void> {
  const person = await ports.repo.getPerson(userId);
  if (person === null) throw new Error('missing person');
  await ports.repo.putPerson({ ...person, accountState: 'suspended' });
}

describe('R1 — an old accepted response does not outlive removal from a group', () => {
  for (const exclude of [false, true]) {
    it(`refuses an outcome from a participant accepted then ${exclude ? 'excluded' : 'removed'}`, async () => {
      const signalId = await hostedSignal('join', 4);
      const responseId = await respond(signalId, DEMO_USERS.hugo);
      const accepted = await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' });
      expect(accepted.ok).toBe(true);
      await removeParticipant(ports, { hostId: DEMO_USERS.lea, signalId, userId: DEMO_USERS.hugo, exclude });

      const before = (await ports.repo.listAnalytics()).length;
      expect(await recordLocalOutcome(ports, { actorId: DEMO_USERS.hugo, signalId })).toEqual({
        ok: false,
        reason: 'not_participant',
      });
      expect((await ports.repo.listAnalytics()).length).toBe(before);
    });
  }

  it('still accepts an accepted responder on an Offer, and the host of the group', async () => {
    const offer = await hostedSignal('offer');
    const responseId = await respond(offer, DEMO_USERS.hugo);
    await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' });
    expect((await recordLocalOutcome(ports, { actorId: DEMO_USERS.hugo, signalId: offer })).ok).toBe(true);

    const group = await hostedSignal('event', 4);
    expect((await recordLocalOutcome(ports, { actorId: DEMO_USERS.lea, signalId: group })).ok).toBe(true);
  });

  it('refuses an accepted Offer responder the host later excluded', async () => {
    const offer = await hostedSignal('offer');
    const responseId = await respond(offer, DEMO_USERS.hugo);
    await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' });
    await removeParticipant(ports, { hostId: DEMO_USERS.lea, signalId: offer, userId: DEMO_USERS.hugo, exclude: true });
    expect(reasonOf(await recordLocalOutcome(ports, { actorId: DEMO_USERS.hugo, signalId: offer }))).toBe(
      'not_participant',
    );
  });
});

describe('R2 — existing membership never bypasses current eligibility', () => {
  it('refuses a repeat join from an account suspended since it joined, and writes nothing', async () => {
    const signalId = await hostedSignal('event', 4);
    expect((await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId })).ok).toBe(true);
    await suspend(DEMO_USERS.hugo);

    const before = await snapshot(signalId);
    expect(await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId })).toEqual({
      ok: false,
      reason: 'account_suspended',
    });
    expect(await snapshot(signalId)).toEqual(before);
  });

  it('refuses a repeat join after a block with the host, or once the signal closed', async () => {
    const blocked = await hostedSignal('event', 4);
    await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId: blocked });
    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.hugo });
    expect(reasonOf(await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId: blocked }))).toBe('blocked');

    const closed = await hostedSignal('event', 4);
    await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: closed });
    await closeSignal(ports, { hostId: DEMO_USERS.lea, signalId: closed });
    expect(reasonOf(await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: closed }))).toBe('signal_not_open');
  });

  it('still lets an eligible member retry into a full activity without a duplicate', async () => {
    const signalId = await hostedSignal('event', 1);
    await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId });
    const before = await snapshot(signalId);
    expect((await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId })).ok).toBe(true);
    expect(await snapshot(signalId)).toEqual(before);
  });

  it('refuses to accept a pending response from a member now blocked with the host, and writes nothing', async () => {
    const signalId = await hostedSignal('join', 4);
    const responseId = await respond(signalId, DEMO_USERS.hugo);
    await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId });
    await blockUser(ports, { actorId: DEMO_USERS.hugo, targetId: DEMO_USERS.lea });

    const before = await snapshot(signalId);
    expect(await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' })).toEqual({
      ok: false,
      reason: 'blocked',
    });
    expect(await snapshot(signalId)).toEqual(before);
  });

  it('refuses to accept a pending response from a member suspended since joining', async () => {
    const signalId = await hostedSignal('join', 1);
    const responseId = await respond(signalId, DEMO_USERS.hugo);
    await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId });
    await suspend(DEMO_USERS.hugo);

    const before = await snapshot(signalId);
    expect(reasonOf(await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId, decision: 'accepted' }))).toBe(
      'account_suspended',
    );
    expect(await snapshot(signalId)).toEqual(before);
  });

  it('revalidates a repeated acceptance instead of reporting stale success', async () => {
    const group = await hostedSignal('join', 4);
    const groupResponse = await respond(group, DEMO_USERS.hugo);
    await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId: groupResponse, decision: 'accepted' });

    const offer = await hostedSignal('offer');
    const offerResponse = await respond(offer, DEMO_USERS.marc);
    await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId: offerResponse, decision: 'accepted' });

    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.hugo });
    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.marc });
    expect(
      reasonOf(await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId: groupResponse, decision: 'accepted' })),
    ).toBe('blocked');
    expect(
      reasonOf(await decideResponse(ports, { hostId: DEMO_USERS.lea, responseId: offerResponse, decision: 'accepted' })),
    ).toBe('blocked');
  });
});
