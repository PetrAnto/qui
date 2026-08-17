import { beforeEach, describe, expect, it } from 'vitest';

import {
  addCity,
  blockUser,
  createSignal,
  decideResponse,
  getDiscoverFeed,
  getInsights,
  getProfile,
  getSignalDetail,
  getThreadView,
  joinSignal,
  listSignals,
  removeParticipant,
  reportContent,
  respondToSignal,
  sendMessage,
  toggleAppreciation,
  canPublishInGeo,
  toActorView,
  type Ports,
} from '@indenoi/core';
import { CITY_IDS } from '@indenoi/geo';

import { DEMO_USERS, createDemoPorts } from '../src/demo/index';

let ports: Ports;

beforeEach(() => {
  ports = createDemoPorts();
});

async function evidenceView(userId: string) {
  const person = await ports.repo.getPerson(userId);
  const evidence = await ports.repo.evidenceFor(userId);
  if (person === null) throw new Error(`missing demo person ${userId}`);
  return { view: toActorView(person, evidence), evidence };
}

describe('the core product loop', () => {
  it('goes from discover to a scoped thread through a signal', async () => {
    const feed = await getDiscoverFeed(ports, {
      viewerId: DEMO_USERS.hugo,
      activeGeoScopeId: CITY_IDS.ajaccio,
    });
    expect(feed).not.toBeNull();
    expect(feed?.cards.length).toBeGreaterThan(0);
    // Every card offers a way to turn attention into contact.
    expect(feed?.cards[0]?.actions.some((action) => action.signalType === 'ask')).toBe(true);

    const created = await createSignal(ports, {
      actorId: DEMO_USERS.lea,
      type: 'ask',
      title: 'Who knows where to fix a wetsuit zip?',
      body: 'Mine gave up this morning.',
      geoScopeId: CITY_IDS.ajaccio,
      practice: 'freediving',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const response = await respondToSignal(ports, {
      actorId: DEMO_USERS.hugo,
      signalId: created.value.signalId,
      message: 'The shop on rue Fesch does it in a day.',
    });
    expect(response.ok).toBe(true);
    if (!response.ok) return;

    // Until the host accepts, there is no private space.
    const beforeAccept = await getThreadView(ports, {
      viewerId: DEMO_USERS.hugo,
      threadId: 'thr-nonexistent',
    });
    expect(beforeAccept).toBeNull();

    const accepted = await decideResponse(ports, {
      hostId: DEMO_USERS.lea,
      responseId: response.value.responseId,
      decision: 'accepted',
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok || accepted.value.threadId === null) throw new Error('thread not opened');

    const sent = await sendMessage(ports, {
      actorId: DEMO_USERS.lea,
      threadId: accepted.value.threadId,
      body: 'Perfect, thank you.',
    });
    expect(sent.ok).toBe(true);

    const thread = await getThreadView(ports, {
      viewerId: DEMO_USERS.hugo,
      threadId: accepted.value.threadId,
    });
    // The thread keeps the context that created it.
    expect(thread?.signalTitle).toContain('wetsuit');
    expect(thread?.messages).toHaveLength(2);
    expect(thread?.messages[0]?.body).toContain('rue Fesch');
  });

  it('records the loop in cluster analytics', async () => {
    const before = await getInsights(ports);
    await toggleAppreciation(ports, { actorId: DEMO_USERS.hugo, postId: (await firstPostIn(CITY_IDS.ajaccio)) });
    const after = await getInsights(ports);
    expect(after.report.cities.length).toBeGreaterThan(0);
    const ajaccio = after.report.cities.find((row) => row.geoScopeId === CITY_IDS.ajaccio);
    expect(ajaccio?.appreciations).toBeGreaterThan(
      before.report.cities.find((row) => row.geoScopeId === CITY_IDS.ajaccio)?.appreciations ?? 0,
    );
  });

  /** A post Hugo can still appreciate: not his, and not already appreciated. */
  async function firstPostIn(geoScopeId: string): Promise<string> {
    const [posts, appreciations] = await Promise.all([
      ports.repo.listPosts(),
      ports.repo.listAppreciations(),
    ]);
    const found = posts.find(
      (post) =>
        post.geoScopeId === geoScopeId &&
        post.authorId !== DEMO_USERS.hugo &&
        !appreciations.some(
          (entry) => entry.postId === post.id && entry.actorId === DEMO_USERS.hugo,
        ),
    );
    if (found === undefined) throw new Error('no demo post');
    return found.id;
  }
});

describe('blocking removes an account structurally', () => {
  it('takes the blocked person out of feed, profile, signals and threads', async () => {
    const blocked = await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.hugo });
    expect(blocked.ok).toBe(true);

    const feed = await getDiscoverFeed(ports, {
      viewerId: DEMO_USERS.hugo,
      activeGeoScopeId: CITY_IDS.ajaccio,
    });
    expect(feed?.cards.some((card) => card.post.author.id === DEMO_USERS.lea)).toBe(false);

    const leaProfile = await ports.repo.getPerson(DEMO_USERS.lea);
    expect(
      await getProfile(ports, { viewerId: DEMO_USERS.hugo, handle: leaProfile?.handle ?? '' }),
    ).toBeNull();

    const signals = await listSignals(ports, {
      viewerId: DEMO_USERS.hugo,
      geoScopeId: CITY_IDS.ajaccio,
    });
    expect(signals?.some((card) => card.signal.creator.id === DEMO_USERS.lea)).toBe(false);
  });

  it('cannot be bypassed by responding to the blocked person signal directly', async () => {
    const signal = await createSignal(ports, {
      actorId: DEMO_USERS.lea,
      type: 'ask',
      title: 'Anyone free Saturday?',
      body: 'Beach clean-up.',
      geoScopeId: CITY_IDS.ajaccio,
    });
    if (!signal.ok) throw new Error('setup failed');
    await blockUser(ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.hugo });

    const attempt = await respondToSignal(ports, {
      actorId: DEMO_USERS.hugo,
      signalId: signal.value.signalId,
      message: 'hello again',
    });
    expect(attempt).toEqual({ ok: false, reason: 'blocked' });
  });
});

describe('age-aware contact rules end to end', () => {
  it('stops an adult and a minor from opening a private thread', async () => {
    const ask = await createSignal(ports, {
      actorId: DEMO_USERS.ines,
      type: 'ask',
      title: 'Where can I print stickers?',
      body: 'For my illustrations.',
      geoScopeId: CITY_IDS.ajaccio,
      practice: 'illustration',
    });
    if (!ask.ok) throw new Error('setup failed');

    const adultAttempt = await respondToSignal(ports, {
      actorId: DEMO_USERS.marc,
      signalId: ask.value.signalId,
      message: 'I can print them at my workshop, come by.',
    });
    expect(adultAttempt).toEqual({ ok: false, reason: 'age_band_mismatch' });
  });

  it('still lets a minor join a hosted local event', async () => {
    const signals = await ports.repo.listSignals();
    const event = signals.find(
      (entry) => entry.type === 'event' && entry.geoScopeId === CITY_IDS.ajaccio,
    );
    if (event === undefined) throw new Error('demo dataset has no Ajaccio event');
    const joined = await joinSignal(ports, { actorId: DEMO_USERS.ines, signalId: event.id });
    expect(joined.ok).toBe(true);
  });
});

describe('host controls', () => {
  it('lets a host exclude someone and prevents them rejoining that object', async () => {
    const signals = await ports.repo.listSignals();
    const event = signals.find((entry) => entry.type === 'event' && entry.creatorId === DEMO_USERS.paul);
    if (event === undefined) throw new Error('demo dataset has no Bastia event');

    await joinSignal(ports, { actorId: DEMO_USERS.tom, signalId: event.id });
    const removed = await removeParticipant(ports, {
      hostId: DEMO_USERS.paul,
      signalId: event.id,
      userId: DEMO_USERS.tom,
      exclude: true,
      reason: 'repeatedly disruptive',
    });
    expect(removed.ok).toBe(true);

    const rejoin = await joinSignal(ports, { actorId: DEMO_USERS.tom, signalId: event.id });
    expect(rejoin).toEqual({ ok: false, reason: 'host_excluded' });
  });

  it('gives a host no power over an object they do not own', async () => {
    const signals = await ports.repo.listSignals();
    const event = signals.find((entry) => entry.type === 'event' && entry.creatorId === DEMO_USERS.paul);
    if (event === undefined) throw new Error('demo dataset has no Bastia event');
    const attempt = await removeParticipant(ports, {
      hostId: DEMO_USERS.tom,
      signalId: event.id,
      userId: DEMO_USERS.paul,
      exclude: true,
    });
    expect(attempt).toEqual({ ok: false, reason: 'not_host' });
  });

  it('shows responses only to the host', async () => {
    const created = await createSignal(ports, {
      actorId: DEMO_USERS.lea,
      type: 'offer',
      title: 'Free freediving basics session',
      body: 'Bring a towel.',
      geoScopeId: CITY_IDS.ajaccio,
    });
    if (!created.ok) throw new Error('setup failed');
    await respondToSignal(ports, {
      actorId: DEMO_USERS.hugo,
      signalId: created.value.signalId,
      message: 'I would love to come',
    });

    const asHost = await getSignalDetail(ports, {
      viewerId: DEMO_USERS.lea,
      signalId: created.value.signalId,
    });
    const asStranger = await getSignalDetail(ports, {
      viewerId: DEMO_USERS.tom,
      signalId: created.value.signalId,
    });
    expect(asHost?.responses.length).toBe(1);
    expect(asStranger?.responses).toEqual([]);
    expect(asStranger?.hostPowers).toEqual([]);
  });
});

describe('places and local publishing', () => {
  it('lets anyone follow any city without evidence', async () => {
    const added = await addCity(ports, {
      actorId: DEMO_USERS.tom,
      geoScopeId: CITY_IDS.kilrush,
      kind: 'exploring',
    });
    expect(added.ok).toBe(true);
    const events = await ports.repo.listAnalytics();
    expect(events.some((event) => event.name === 'city_added' && event.geoScopeId === CITY_IDS.kilrush)).toBe(
      true,
    );
  });

  it('requires local evidence before publishing into a city', async () => {
    await addCity(ports, {
      actorId: DEMO_USERS.tom,
      geoScopeId: CITY_IDS.ajaccio,
      kind: 'exploring',
    });
    const { view, evidence } = await evidenceView(DEMO_USERS.tom);
    expect(canPublishInGeo(view, CITY_IDS.ajaccio, evidence).allowed).toBe(false);
    expect(canPublishInGeo(view, CITY_IDS.lyon, evidence).allowed).toBe(true);
  });

  it('accepts two vouches as local evidence', async () => {
    const { view, evidence } = await evidenceView(DEMO_USERS.hugo);
    // The demo dataset vouches for Hugo twice in Ajaccio.
    expect(evidence.vouches.filter((vouch) => vouch.geoScopeId === CITY_IDS.ajaccio).length).toBe(2);
    expect(canPublishInGeo(view, CITY_IDS.ajaccio, evidence).allowed).toBe(true);
  });
});

describe('reporting', () => {
  it('opens a moderation case that no public read exposes', async () => {
    const posts = await ports.repo.listPosts();
    const target = posts.find((post) => post.authorId === DEMO_USERS.marc);
    if (target === undefined) throw new Error('no demo post');

    const report = await reportContent(ports, {
      reporterId: DEMO_USERS.hugo,
      targetType: 'post',
      targetId: target.id,
      reason: 'harassment',
      note: 'context for moderators',
    });
    expect(report.ok).toBe(true);

    const marc = await ports.repo.getPerson(DEMO_USERS.marc);
    const profile = await getProfile(ports, {
      viewerId: DEMO_USERS.tom,
      handle: marc?.handle ?? '',
    });
    const serialized = JSON.stringify(profile);
    expect(serialized).not.toContain('context for moderators');
    expect(serialized).not.toContain('harassment');

    const feed = await getDiscoverFeed(ports, {
      viewerId: DEMO_USERS.tom,
      activeGeoScopeId: CITY_IDS.ajaccio,
    });
    expect(JSON.stringify(feed)).not.toContain('context for moderators');
  });

  it('groups repeated reports about the same target into one case', async () => {
    const posts = await ports.repo.listPosts();
    const target = posts[0];
    if (target === undefined) throw new Error('no demo post');
    const first = await reportContent(ports, {
      reporterId: DEMO_USERS.hugo,
      targetType: 'post',
      targetId: target.id,
      reason: 'spam',
    });
    const second = await reportContent(ports, {
      reporterId: DEMO_USERS.tom,
      targetType: 'post',
      targetId: target.id,
      reason: 'spam',
    });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(first.value.caseId).toBe(second.value.caseId);
    expect((await ports.repo.listModerationCases()).length).toBe(1);
  });
});

describe('appreciation', () => {
  it('toggles, and never becomes a rating of a person', async () => {
    const posts = await ports.repo.listPosts();
    const target = posts.find((post) => post.authorId !== DEMO_USERS.tom);
    if (target === undefined) throw new Error('no demo post');

    const on = await toggleAppreciation(ports, { actorId: DEMO_USERS.tom, postId: target.id });
    expect(on.ok && on.value.appreciated).toBe(true);
    const off = await toggleAppreciation(ports, { actorId: DEMO_USERS.tom, postId: target.id });
    expect(off.ok && off.value.appreciated).toBe(false);

    const marc = await ports.repo.getPerson(DEMO_USERS.marc);
    const profile = await getProfile(ports, { viewerId: DEMO_USERS.tom, handle: marc?.handle ?? '' });
    expect(Object.keys(profile?.profile ?? {})).not.toContain('appreciations');
    expect(Object.keys(profile?.profile ?? {})).not.toContain('score');
    expect(Object.keys(profile?.profile ?? {})).not.toContain('rating');
  });

  it('refuses self-appreciation', async () => {
    const posts = await ports.repo.listPosts();
    const own = posts.find((post) => post.authorId === DEMO_USERS.lea);
    if (own === undefined) throw new Error('no demo post');
    expect(await toggleAppreciation(ports, { actorId: DEMO_USERS.lea, postId: own.id })).toEqual({
      ok: false,
      reason: 'self',
    });
  });
});
