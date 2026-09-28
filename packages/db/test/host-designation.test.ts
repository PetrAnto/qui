import { beforeEach, describe, expect, it } from 'vitest';

import {
  activeParticipants,
  addCity,
  blockUser,
  closeSignal,
  confirmHost,
  createSignal,
  decideResponse,
  describeSignal,
  getProfile,
  getSignalDetail,
  joinSignal,
  listSignals,
  publishProposal,
  recordLocalOutcome,
  removeCity,
  removeParticipant,
  respondToSignal,
  searchActivities,
  volunteerToHost,
  type AccountState,
  type ActivitySearchInput,
  type Ports,
} from '@indenoi/core';
import { CITY_IDS } from '@indenoi/geo';

import { DEMO_USERS, createDemoPorts } from '../src/demo/index';

/**
 * Designating the host of an activity proposal (ADR-0016 P1, INV-HOST-3), end
 * to end against the synthetic demo store. Demo clock: Sun 16 Aug 2026.
 *
 * Cast: Marc proposes in Ajaccio (resident). Léa (resident) and Hugo
 * (origin_family) have local ties there; Maya is only a visitor, Tom only
 * exploring, Paul has no tie; Inès is a minor.
 */

let ports: Ports;

beforeEach(() => {
  ports = createDemoPorts();
});

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

async function proposal(actorId: string = DEMO_USERS.marc): Promise<string> {
  const result = await publishProposal(ports, { actorId, input: PADDLE, proposalKey: 'host-key-0001' });
  if (!result.ok) throw new Error(`publish failed: ${result.reason}`);
  return result.value.signalId;
}

async function offer(signalId: string, actorId: string): Promise<void> {
  const result = await volunteerToHost(ports, { actorId, signalId });
  if (!result.ok) throw new Error(`offer failed: ${result.reason}`);
}

async function hosted(volunteerId: string = DEMO_USERS.lea): Promise<string> {
  const id = await proposal();
  await offer(id, volunteerId);
  const result = await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId });
  if (!result.ok) throw new Error(`confirm failed: ${result.reason}`);
  return id;
}

async function setState(userId: string, accountState: AccountState): Promise<void> {
  const person = await ports.repo.getPerson(userId);
  if (person === null) throw new Error('missing person');
  await ports.repo.putPerson({ ...person, accountState });
}

describe('the journey: volunteer, proposer confirms, eligible people join', () => {
  it('keeps the same activity, plan and windows; fixes no appointment and joins nobody', async () => {
    const id = await proposal();
    const before = await ports.repo.getSignal(id);

    expect(await volunteerToHost(ports, { actorId: DEMO_USERS.lea, signalId: id })).toEqual({
      ok: true,
      value: { offered: true },
    });
    // An offer alone changes nothing on the activity.
    expect(await ports.repo.getSignal(id)).toEqual(before);

    expect(
      await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea }),
    ).toEqual({ ok: true, value: { hostId: DEMO_USERS.lea, designated: true } });

    const after = await ports.repo.getSignal(id);
    expect(after).toEqual({ ...before, hostId: DEMO_USERS.lea });
    expect(after).toMatchObject({ id, creatorId: DEMO_USERS.marc, startsAt: null, capacity: null, state: 'open' });
    expect(after?.plan).toEqual(before?.plan);
    expect(await ports.repo.listParticipants(id)).toEqual([]);
    expect(await ports.repo.listResponses({ signalId: id })).toEqual([]);
    expect(await ports.repo.listHostOffers(id)).toMatchObject([{ volunteerId: DEMO_USERS.lea, state: 'accepted' }]);

    const audit = (await ports.repo.listAudit()).filter((row) => row.subjectId === id);
    expect(audit.map((row) => [row.action, row.actorId])).toEqual(
      expect.arrayContaining([
        ['host_offered', DEMO_USERS.lea],
        ['host_designated', DEMO_USERS.marc],
      ]),
    );
  });

  it('shows the designated host, and then an eligible adult joins with the existing rules', async () => {
    const id = await hosted();
    const detail = await getSignalDetail(ports, { viewerId: DEMO_USERS.hugo, signalId: id });
    expect(detail?.signal).toMatchObject({
      hostless: false,
      creator: { id: DEMO_USERS.marc },
      host: { id: DEMO_USERS.lea },
    });
    expect(detail?.eligibility).toEqual({ allowed: true });

    expect(await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId: id })).toEqual({
      ok: true,
      value: { signalId: id },
    });
    const participants = await ports.repo.listParticipants(id);
    expect(participants.map((entry) => [entry.userId, entry.state])).toEqual([[DEMO_USERS.hugo, 'joined']]);
    expect((await getSignalDetail(ports, { viewerId: DEMO_USERS.hugo, signalId: id }))?.viewerJoined).toBe(true);
  });

  it('gives the host powers to the designated host only — never to the proposer', async () => {
    const id = await hosted();
    await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId: id });

    const asProposer = await getSignalDetail(ports, { viewerId: DEMO_USERS.marc, signalId: id });
    // Who is coming stays visible, as on every hosted signal; the controls do not.
    expect(asProposer).toMatchObject({ isHost: false, isProposer: true, hostPowers: [], responses: [] });
    expect(
      await removeParticipant(ports, { hostId: DEMO_USERS.marc, signalId: id, userId: DEMO_USERS.hugo, exclude: true }),
    ).toEqual({ ok: false, reason: 'not_host' });
    expect(await closeSignal(ports, { hostId: DEMO_USERS.marc, signalId: id })).toEqual({
      ok: false,
      reason: 'not_host',
    });
    expect((await recordLocalOutcome(ports, { actorId: DEMO_USERS.marc, signalId: id })).ok).toBe(false);

    const asHost = await getSignalDetail(ports, { viewerId: DEMO_USERS.lea, signalId: id });
    expect(asHost).toMatchObject({ isHost: true, isProposer: false });
    expect(asHost?.hostPowers.length).toBeGreaterThan(0);
    expect(asHost?.participants.map((person) => person.id)).toEqual([DEMO_USERS.hugo]);
    expect(await joinSignal(ports, { actorId: DEMO_USERS.lea, signalId: id })).toEqual({ ok: false, reason: 'self' });
    expect(await closeSignal(ports, { hostId: DEMO_USERS.lea, signalId: id })).toMatchObject({ ok: true });
  });

  it('lets the proposer join explicitly, once, as an ordinary participant with no host power', async () => {
    const id = await hosted();
    // Designation joined nobody, the proposer included.
    expect(await ports.repo.listParticipants(id)).toEqual([]);
    const before = await getSignalDetail(ports, { viewerId: DEMO_USERS.marc, signalId: id });
    expect(before).toMatchObject({ isProposer: true, isHost: false, viewerJoined: false });
    expect(before?.eligibility).toEqual({ allowed: true });

    expect(await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: id })).toEqual({
      ok: true,
      value: { signalId: id },
    });
    expect(await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: id })).toMatchObject({ ok: true });
    const rows = await ports.repo.listParticipants(id);
    expect(rows.map((entry) => [entry.userId, entry.state])).toEqual([[DEMO_USERS.marc, 'joined']]);
    const joinedEvents = (await ports.repo.listAnalytics()).filter(
      (event) => event.name === 'participant_joined' && event.targetId === id,
    );
    expect(joinedEvents).toHaveLength(1);

    const after = await getSignalDetail(ports, { viewerId: DEMO_USERS.marc, signalId: id });
    expect(after).toMatchObject({ isHost: false, hostPowers: [], responses: [], viewerJoined: true });
    expect(await closeSignal(ports, { hostId: DEMO_USERS.marc, signalId: id })).toEqual({ ok: false, reason: 'not_host' });
    // As a participant, the proposer may now report the outcome — like anyone who joined.
    expect((await recordLocalOutcome(ports, { actorId: DEMO_USERS.marc, signalId: id })).ok).toBe(true);
    // The host sees them on the list and keeps every power over the list, the proposer included.
    const asHost = await getSignalDetail(ports, { viewerId: DEMO_USERS.lea, signalId: id });
    expect(asHost?.participants.map((person) => person.id)).toEqual([DEMO_USERS.marc]);
    expect(
      await removeParticipant(ports, { hostId: DEMO_USERS.lea, signalId: id, userId: DEMO_USERS.marc, exclude: true }),
    ).toMatchObject({ ok: true });
    expect(await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: id })).toEqual({
      ok: false,
      reason: 'host_excluded',
    });
  });

  it('counts a proposer who joined as a participant for matching, with the host as organizer', async () => {
    const id = await hosted();
    await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: id });
    const signal = await ports.repo.getSignal(id);
    if (signal === null) throw new Error('missing');
    const described = describeSignal(signal, { joinedIds: [DEMO_USERS.marc], timezone: 'Europe/Paris', now: ports.now() });
    expect(described?.participation.organizerId).toBe(DEMO_USERS.lea);
    expect(described === null ? [] : activeParticipants(described.participation).ids).toEqual([DEMO_USERS.marc]);
  });

  it('keeps every participation check for the proposer', async () => {
    // Blocked with the host.
    let id = await hosted();
    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.marc });
    expect(await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: id })).toEqual({ ok: false, reason: 'blocked' });

    // Suspended, full, closed and expired.
    ports = createDemoPorts();
    id = await hosted();
    await setState(DEMO_USERS.marc, 'suspended');
    expect((await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: id })).ok).toBe(false);
    await setState(DEMO_USERS.marc, 'active');
    const signal = await ports.repo.getSignal(id);
    if (signal === null) throw new Error('missing');
    await ports.repo.putSignal({ ...signal, capacity: 1 });
    expect((await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId: id })).ok).toBe(true);
    expect(await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: id })).toEqual({
      ok: false,
      reason: 'signal_full',
    });
    await ports.repo.putSignal({ ...signal, state: 'closed' });
    expect(await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: id })).toEqual({
      ok: false,
      reason: 'signal_not_open',
    });
    await ports.repo.putSignal({ ...signal, expiresAt: '2026-08-16T11:00:00.000Z' });
    expect(await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: id })).toEqual({
      ok: false,
      reason: 'signal_not_open',
    });
  });

  it('still refuses the proposer on a hostless proposal, and the creator-host of an ordinary signal', async () => {
    const id = await proposal();
    expect(await joinSignal(ports, { actorId: DEMO_USERS.marc, signalId: id })).toEqual({ ok: false, reason: 'self' });
    const created = await createSignal(ports, {
      actorId: DEMO_USERS.lea,
      type: 'join',
      title: 'Hosted paddle',
      body: '',
      geoScopeId: CITY_IDS.ajaccio,
    });
    if (!created.ok) throw new Error('setup failed');
    expect(await joinSignal(ports, { actorId: DEMO_USERS.lea, signalId: created.value.signalId })).toEqual({
      ok: false,
      reason: 'self',
    });
  });

  it('shows offers to the proposer only, and each volunteer only their own', async () => {
    const id = await proposal();
    await offer(id, DEMO_USERS.lea);
    await offer(id, DEMO_USERS.hugo);

    const proposer = await getSignalDetail(ports, { viewerId: DEMO_USERS.marc, signalId: id });
    expect(proposer?.hostOffers.map((entry) => entry.volunteer.id).sort()).toEqual(
      [DEMO_USERS.hugo, DEMO_USERS.lea].sort(),
    );
    const volunteer = await getSignalDetail(ports, { viewerId: DEMO_USERS.lea, signalId: id });
    expect(volunteer).toMatchObject({ hostOffers: [], viewerOffered: true });
    const bystander = await getSignalDetail(ports, { viewerId: DEMO_USERS.tom, signalId: id });
    expect(bystander).toMatchObject({ hostOffers: [], viewerOffered: false });
  });

  it('treats a repeated offer and a repeated confirmation as retries', async () => {
    const id = await proposal();
    await offer(id, DEMO_USERS.lea);
    expect(await volunteerToHost(ports, { actorId: DEMO_USERS.lea, signalId: id })).toEqual({
      ok: true,
      value: { offered: false },
    });
    expect(await ports.repo.listHostOffers(id)).toHaveLength(1);

    const input = { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea };
    expect((await confirmHost(ports, input)).ok).toBe(true);
    expect(await confirmHost(ports, input)).toEqual({ ok: true, value: { hostId: DEMO_USERS.lea, designated: false } });
    const designations = (await ports.repo.listAudit()).filter((row) => row.action === 'host_designated');
    expect(designations).toHaveLength(1);
  });
});

describe('neither person can appoint a host alone', () => {
  it('refuses a proposer naming somebody who never offered', async () => {
    const id = await proposal();
    expect(
      await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea }),
    ).toEqual({ ok: false, reason: 'no_host_offer' });
    expect((await ports.repo.getSignal(id))?.hostId).toBeNull();
  });

  it('refuses a volunteer confirming themselves, and any third party confirming', async () => {
    const id = await proposal();
    await offer(id, DEMO_USERS.lea);
    for (const proposerId of [DEMO_USERS.lea, DEMO_USERS.hugo, DEMO_USERS.tom]) {
      expect(await confirmHost(ports, { proposerId, signalId: id, volunteerId: DEMO_USERS.lea })).toEqual({
        ok: false,
        reason: 'not_proposer',
      });
    }
    expect((await ports.repo.getSignal(id))?.hostId).toBeNull();
  });

  it('refuses the proposer volunteering to host their own proposal', async () => {
    const id = await proposal();
    expect(await volunteerToHost(ports, { actorId: DEMO_USERS.marc, signalId: id })).toEqual({
      ok: false,
      reason: 'self',
    });
  });

  it('keeps the existing host requirements: an adult with a local tie to the city', async () => {
    const id = await proposal();
    const tom = await addCity(ports, { actorId: DEMO_USERS.tom, geoScopeId: CITY_IDS.ajaccio, kind: 'exploring' });
    if (!tom.ok) throw new Error('setup failed');

    // A minor, an exploring tie, a visitor tie and no tie at all: each refused.
    for (const actorId of [DEMO_USERS.ines, DEMO_USERS.tom, DEMO_USERS.maya, DEMO_USERS.paul]) {
      const result = await volunteerToHost(ports, { actorId, signalId: id });
      expect(result.ok, actorId).toBe(false);
    }
    expect(await ports.repo.listHostOffers(id)).toEqual([]);
    // A local but non-resident tie (origin_family) qualifies, as it does for hosting.
    expect((await volunteerToHost(ports, { actorId: DEMO_USERS.hugo, signalId: id })).ok).toBe(true);
  });

  it('refuses offers on a signal that is not a hostless proposal', async () => {
    const created = await createSignal(ports, {
      actorId: DEMO_USERS.lea,
      type: 'join',
      title: 'Hosted paddle',
      body: '',
      geoScopeId: CITY_IDS.ajaccio,
    });
    if (!created.ok) throw new Error('setup failed');
    expect(await volunteerToHost(ports, { actorId: DEMO_USERS.marc, signalId: created.value.signalId })).toEqual({
      ok: false,
      reason: 'wrong_signal_type',
    });
    const id = await hosted();
    expect(await volunteerToHost(ports, { actorId: DEMO_USERS.hugo, signalId: id })).toEqual({
      ok: false,
      reason: 'already_hosted',
    });
  });
});

describe('everything is checked again at confirmation', () => {
  it('refuses once the proposer and the volunteer have blocked each other', async () => {
    const id = await proposal();
    await offer(id, DEMO_USERS.lea);
    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.marc });
    const result = await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea });
    expect(result).toEqual({ ok: false, reason: 'blocked' });
    expect((await ports.repo.getSignal(id))?.hostId).toBeNull();
  });

  it('refuses a volunteer or a proposer suspended since the offer', async () => {
    const id = await proposal();
    await offer(id, DEMO_USERS.lea);
    await setState(DEMO_USERS.lea, 'suspended');
    expect(
      (await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea })).ok,
    ).toBe(false);
    await setState(DEMO_USERS.lea, 'active');
    await setState(DEMO_USERS.marc, 'suspended');
    expect(
      (await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea })).ok,
    ).toBe(false);
    expect((await ports.repo.getSignal(id))?.hostId).toBeNull();
  });

  it('refuses a volunteer who lost the local tie since the offer', async () => {
    const id = await proposal();
    // Tom's only claim on Ajaccio is a second home he declares, then removes.
    const added = await addCity(ports, { actorId: DEMO_USERS.tom, geoScopeId: CITY_IDS.ajaccio, kind: 'second_home' });
    if (!added.ok) throw new Error(`setup failed: ${added.reason}`);
    await offer(id, DEMO_USERS.tom);
    const removed = await removeCity(ports, { actorId: DEMO_USERS.tom, geoScopeId: CITY_IDS.ajaccio });
    if (!removed.ok) throw new Error(`setup failed: ${removed.reason}`);
    expect(
      await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.tom }),
    ).toEqual({ ok: false, reason: 'no_local_attachment' });
    expect((await ports.repo.getSignal(id))?.hostId).toBeNull();
  });

  it('refuses a proposal that closed or expired since the offer', async () => {
    const id = await proposal();
    await offer(id, DEMO_USERS.lea);
    const signal = await ports.repo.getSignal(id);
    if (signal === null) throw new Error('missing');

    await ports.repo.putSignal({ ...signal, state: 'closed' });
    expect(
      await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea }),
    ).toEqual({ ok: false, reason: 'signal_not_open' });

    await ports.repo.putSignal({ ...signal, expiresAt: '2026-08-16T11:00:00.000Z' });
    expect(
      await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea }),
    ).toEqual({ ok: false, reason: 'signal_not_open' });
    expect((await ports.repo.getSignal(id))?.hostId).toBeNull();
  });
});

describe('concurrent confirmations install one host', () => {
  it('lets exactly one of two simultaneous confirmations win', async () => {
    const id = await proposal();
    await offer(id, DEMO_USERS.lea);
    await offer(id, DEMO_USERS.hugo);

    const results = await Promise.all([
      confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea }),
      confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.hugo }),
    ]);
    const winners = results.filter((result) => result.ok);
    expect(winners).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, reason: 'already_hosted' }]);

    const winner = winners[0]?.ok ? winners[0].value.hostId : null;
    expect((await ports.repo.getSignal(id))?.hostId).toBe(winner);
    expect((await ports.repo.listAudit()).filter((row) => row.action === 'host_designated')).toHaveLength(1);
    const accepted = (await ports.repo.listHostOffers(id)).filter((entry) => entry.state === 'accepted');
    expect(accepted.map((entry) => entry.volunteerId)).toEqual([winner]);
  });

  it('never replaces a host once designated', async () => {
    const id = await proposal();
    await offer(id, DEMO_USERS.lea);
    await offer(id, DEMO_USERS.hugo);
    await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea });
    expect(
      await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.hugo }),
    ).toEqual({ ok: false, reason: 'already_hosted' });
    expect((await ports.repo.getSignal(id))?.hostId).toBe(DEMO_USERS.lea);
  });

  it('keeps simultaneous identical confirmations to one designation', async () => {
    const id = await proposal();
    await offer(id, DEMO_USERS.lea);
    const input = { proposerId: DEMO_USERS.marc, signalId: id, volunteerId: DEMO_USERS.lea };
    const results = await Promise.all([confirmHost(ports, input), confirmHost(ports, input), confirmHost(ports, input)]);
    expect(results.every((result) => result.ok && result.value.hostId === DEMO_USERS.lea)).toBe(true);
    expect(results.filter((result) => result.ok && result.value.designated)).toHaveLength(1);
    expect((await ports.repo.listAudit()).filter((row) => row.action === 'host_designated')).toHaveLength(1);
  });
});

describe('joining after designation keeps every existing restriction', () => {
  it('applies the same age rule as an ordinary hosted join by the same host', async () => {
    const id = await hosted();
    const control = await createSignal(ports, {
      actorId: DEMO_USERS.lea,
      type: 'join',
      title: 'Hosted paddle',
      body: '',
      geoScopeId: CITY_IDS.ajaccio,
    });
    if (!control.ok) throw new Error('setup failed');
    const viaProposal = await joinSignal(ports, { actorId: DEMO_USERS.ines, signalId: id });
    const viaHosted = await joinSignal(ports, { actorId: DEMO_USERS.ines, signalId: control.value.signalId });
    expect(viaProposal.ok).toBe(viaHosted.ok);
    if (!viaProposal.ok && !viaHosted.ok) expect(viaProposal.reason).toBe(viaHosted.reason);
  });

  it('refuses someone blocked with the host, or with the proposer', async () => {
    const id = await hosted();
    await blockUser(ports, { actorId: DEMO_USERS.hugo, targetId: DEMO_USERS.lea });
    expect(await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId: id })).toMatchObject({ ok: false });

    const second = await addCity(ports, { actorId: DEMO_USERS.paul, geoScopeId: CITY_IDS.ajaccio, kind: 'exploring' });
    if (!second.ok) throw new Error('setup failed');
    await blockUser(ports, { actorId: DEMO_USERS.marc, targetId: DEMO_USERS.paul });
    expect(await joinSignal(ports, { actorId: DEMO_USERS.paul, signalId: id })).toMatchObject({ ok: false });
    expect(await ports.repo.listParticipants(id)).toEqual([]);
  });

  it('refuses joining while the designated host is suspended', async () => {
    const id = await hosted();
    await setState(DEMO_USERS.lea, 'suspended');
    expect(await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId: id })).toEqual({
      ok: false,
      reason: 'author_suspended',
    });
  });

  it('sends a response to the designated host only, and opens no contact path to the proposer', async () => {
    // Paul has no reason to contact Marc before; a proposal Léa hosts adds none.
    const added = await addCity(ports, { actorId: DEMO_USERS.paul, geoScopeId: CITY_IDS.ajaccio, kind: 'exploring' });
    if (!added.ok) throw new Error('setup failed');
    // Marc's own demo signals would give that reason, so they are closed first.
    for (const signal of await ports.repo.listSignals()) {
      if (signal.creatorId === DEMO_USERS.marc) await ports.repo.putSignal({ ...signal, state: 'closed' });
    }
    const before = await getProfile(ports, { viewerId: DEMO_USERS.paul, handle: 'demo-marc' });
    expect(before?.contact.allowed).toBe(false);
    const id = await hosted();
    // Answering a hosted Join is an existing path; the host decides, not the proposer.
    const sent = await respondToSignal(ports, { actorId: DEMO_USERS.hugo, signalId: id, message: 'Hi' });
    if (!sent.ok) throw new Error(`respond failed: ${sent.reason}`);
    const [response] = await ports.repo.listResponses({ signalId: id });
    if (response === undefined) throw new Error('missing response');
    expect(
      await decideResponse(ports, { hostId: DEMO_USERS.marc, responseId: response.id, decision: 'accepted' }),
    ).toEqual({ ok: false, reason: 'not_host' });
    expect((await getSignalDetail(ports, { viewerId: DEMO_USERS.marc, signalId: id }))?.responses).toEqual([]);
    expect(
      (await getSignalDetail(ports, { viewerId: DEMO_USERS.lea, signalId: id }))?.responses.map((entry) => entry.id),
    ).toEqual([response.id]);
    const after = await getProfile(ports, { viewerId: DEMO_USERS.paul, handle: 'demo-marc' });
    expect(after?.signals.map((signal) => signal.id)).toContain(id);
    expect(after?.contact).toEqual(before?.contact);
    expect(after?.contact.allowed).toBe(false);
  });

  it('is listed with its host for other viewers', async () => {
    const id = await hosted();
    const cards = await listSignals(ports, { viewerId: DEMO_USERS.hugo, geoScopeId: CITY_IDS.ajaccio });
    const card = cards?.find((entry) => entry.signal.id === id);
    expect(card?.signal.host?.id).toBe(DEMO_USERS.lea);
    expect(card?.eligibility).toEqual({ allowed: true });
  });
});

describe('the designated host counts for visibility too (INV-BLOCK-1, INV-SUSPEND-1)', () => {
  async function visibleTo(viewerId: string, id: string) {
    const detail = await getSignalDetail(ports, { viewerId, signalId: id });
    const cards = await listSignals(ports, { viewerId, geoScopeId: CITY_IDS.ajaccio });
    const found = await searchActivities(ports, {
      viewerId,
      input: { practice: 'paddle', geoScopeId: CITY_IDS.ajaccio, slots: [PADDLE.slots[0]!], durationMinutes: 90 },
    });
    return {
      detail: detail !== null,
      listed: cards?.some((card) => card.signal.id === id) ?? false,
      searched: found.ok && found.value.results.some((result) => result.match.signalId === id),
    };
  }

  it('hides a hosted proposal from somebody who blocked its host', async () => {
    const id = await hosted();
    expect(await visibleTo(DEMO_USERS.hugo, id)).toEqual({ detail: true, listed: true, searched: true });

    await blockUser(ports, { actorId: DEMO_USERS.hugo, targetId: DEMO_USERS.lea });
    expect(await visibleTo(DEMO_USERS.hugo, id)).toEqual({ detail: false, listed: false, searched: false });
  });

  it('hides it just the same when the host is the one who blocked', async () => {
    const id = await hosted();
    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.hugo });
    expect(await visibleTo(DEMO_USERS.hugo, id)).toEqual({ detail: false, listed: false, searched: false });
  });

  it('hides it from Marc\'s profile for somebody blocked with the host', async () => {
    const id = await hosted();
    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.hugo });
    const profile = await getProfile(ports, { viewerId: DEMO_USERS.hugo, handle: 'demo-marc' });
    expect(profile?.signals.map((signal) => signal.id) ?? []).not.toContain(id);
  });

  it('hides it while its host is suspended', async () => {
    const id = await hosted();
    await setState(DEMO_USERS.lea, 'suspended');
    expect(await visibleTo(DEMO_USERS.hugo, id)).toEqual({ detail: false, listed: false, searched: false });
  });

  it('lets the proposer keep reading their own activity, without naming a host they are blocked with', async () => {
    const id = await hosted();
    await blockUser(ports, { actorId: DEMO_USERS.marc, targetId: DEMO_USERS.lea });
    const detail = await getSignalDetail(ports, { viewerId: DEMO_USERS.marc, signalId: id });
    expect(detail?.signal).toMatchObject({ id, hostless: false, host: null });
    expect(detail).toMatchObject({ isHost: false, hostPowers: [] });
    // And nobody can join across that block.
    expect(await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId: id })).toMatchObject({ ok: true });
  });
});

describe('existing hosted signals are unchanged', () => {
  it('still host, join and close exactly as before', async () => {
    const created = await createSignal(ports, {
      actorId: DEMO_USERS.lea,
      type: 'join',
      title: 'Hosted paddle',
      body: '',
      geoScopeId: CITY_IDS.ajaccio,
    });
    if (!created.ok) throw new Error('setup failed');
    const id = created.value.signalId;
    const detail = await getSignalDetail(ports, { viewerId: DEMO_USERS.hugo, signalId: id });
    expect(detail?.signal).toMatchObject({ creator: { id: DEMO_USERS.lea }, host: { id: DEMO_USERS.lea } });
    expect(detail).toMatchObject({ isProposer: false, hostOffers: [], viewerOffered: false });
    expect((await joinSignal(ports, { actorId: DEMO_USERS.hugo, signalId: id })).ok).toBe(true);
    expect((await closeSignal(ports, { hostId: DEMO_USERS.lea, signalId: id })).ok).toBe(true);
    expect(await ports.repo.listHostOffers(id)).toEqual([]);
  });
});
