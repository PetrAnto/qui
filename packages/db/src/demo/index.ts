import type {
  AnalyticsEvent,
  Appreciation,
  Attestation,
  BlockEdge,
  CommunityInvite,
  GeoAttachment,
  Message,
  Participant,
  Person,
  Ports,
  Post,
  Signal,
  SignalResponse,
  Thread,
  VouchEvidence,
} from '@indenoi/core';
import { buildAnalyticsEvent } from '@indenoi/core';
import { CITY_IDS, GAZETTEER } from '@indenoi/geo';

import { createInMemoryRepository, type SeedData } from '../memory';
import {
  DEMO_BLOCKS,
  DEMO_INVITES,
  DEMO_NOW,
  DEMO_PEOPLE,
  DEMO_POSTS,
  DEMO_SIGNALS,
  DEMO_THREAD,
  DEMO_VOUCHES,
  type CityKey,
} from './data';

export { DEMO_NOW } from './data';

/** Stable handles for the demo cast, used by seeds, tests and the UI switcher. */
export const DEMO_USERS = {
  lea: 'usr-lea',
  marc: 'usr-marc',
  ines: 'usr-ines',
  paul: 'usr-paul',
  sofia: 'usr-sofia',
  yanis: 'usr-yanis',
  claire: 'usr-claire',
  tom: 'usr-tom',
  nour: 'usr-nour',
  eoin: 'usr-eoin',
  rita: 'usr-rita',
  hugo: 'usr-hugo',
  noa: 'usr-noa',
  maya: 'usr-maya',
} as const;

export const DEMO_HANDLES: readonly string[] = DEMO_PEOPLE.map((person) => `demo-${person.key}`);

function userId(key: string): string {
  return `usr-${key}`;
}

function shift(hours: number): string {
  return new Date(Date.parse(DEMO_NOW) + hours * 3_600_000).toISOString();
}

function ago(hours: number): string {
  return shift(-hours);
}

/**
 * Builds the demo dataset.
 *
 * Fully deterministic: no clock, no randomness, no id generator. Two calls
 * produce byte-identical data, which is what lets the Playwright smoke test and
 * the domain tests assert on specific content.
 */
export function buildDemoDataset(): SeedData {
  const people: Person[] = DEMO_PEOPLE.map((entry) => ({
    id: userId(entry.key),
    handle: `demo-${entry.key}`,
    displayName: entry.displayName,
    avatar: {
      id: `media-avatar-${entry.key}`,
      kind: 'image',
      alt: `${entry.displayName}, demo profile portrait`,
      seed: `avatar-${entry.key}`,
      motif: entry.avatarMotif,
      metadataStripped: true,
    },
    bio: entry.bio,
    ageBand: entry.ageBand,
    accountState: entry.accountState,
    role: entry.role,
    practices: entry.practices,
    interests: entry.interests,
    canHelpWith: entry.canHelpWith,
    wantsToLearn: entry.wantsToLearn,
    createdAt: ago(720),
    demo: true,
  }));

  const attachments: GeoAttachment[] = DEMO_PEOPLE.flatMap((entry) =>
    entry.places.map((place) => ({
      userId: userId(entry.key),
      geoScopeId: CITY_IDS[place.city],
      kind: place.kind,
      // Residence and work/study ties are attested in this dataset; everything
      // else is what the person declared.
      evidence:
        place.kind === 'resident' || place.kind === 'work_study'
          ? ('attested' as const)
          : ('declared' as const),
      since: ago(700),
    })),
  );

  const attestations: Attestation[] = [];
  for (const entry of DEMO_PEOPLE) {
    const subjectId = userId(entry.key);
    attestations.push({
      id: `att-email-${entry.key}`,
      subjectId,
      kind: 'email_verified',
      geoScopeId: null,
      result: 'verified',
      method: 'demo',
      providerRef: null,
      ageThreshold: null,
      country: null,
      issuedAt: ago(700),
      expiresAt: null,
    });
    attestations.push({
      id: `att-age-${entry.key}`,
      subjectId,
      kind: 'age_threshold_verified',
      geoScopeId: null,
      result: 'verified',
      method: 'demo',
      providerRef: null,
      // Only the threshold that was checked is ever recorded.
      ageThreshold: entry.ageBand === 'adult_18_plus' ? 18 : 15,
      country: null,
      issuedAt: ago(700),
      expiresAt: null,
    });
    for (const place of entry.places) {
      if (place.kind !== 'resident' && place.kind !== 'work_study') continue;
      attestations.push({
        id: `att-local-${entry.key}-${place.city}`,
        subjectId,
        kind: 'local_presence_verified',
        geoScopeId: CITY_IDS[place.city],
        result: 'verified',
        method: 'demo',
        providerRef: null,
        ageThreshold: null,
        country: null,
        issuedAt: ago(690),
        expiresAt: null,
      });
    }
  }

  const posts: Post[] = DEMO_POSTS.map((entry) => ({
    id: `post-${entry.key}`,
    authorId: userId(entry.author),
    geoScopeId: CITY_IDS[entry.city],
    caption: entry.caption,
    practice: entry.practice,
    media: {
      id: `media-${entry.key}`,
      kind: 'image',
      alt: entry.caption,
      seed: `post-${entry.key}`,
      motif: entry.motif,
      metadataStripped: true,
    },
    audience: 'all',
    state: 'published',
    createdAt: ago(entry.hoursAgo),
    demo: true,
  }));

  const appreciations: Appreciation[] = DEMO_POSTS.flatMap((entry) =>
    entry.appreciatedBy.map((actor) => ({
      id: `appr-${entry.key}-${actor}`,
      postId: `post-${entry.key}`,
      actorId: userId(actor),
      createdAt: ago(entry.hoursAgo - 1),
    })),
  );

  const signals: Signal[] = DEMO_SIGNALS.map((entry) => ({
    id: `sig-${entry.key}`,
    creatorId: userId(entry.creator),
    type: entry.type,
    title: entry.title,
    body: entry.body,
    geoScopeId: CITY_IDS[entry.city],
    practice: entry.practice,
    linkedPostId: entry.linkedPost === null ? null : `post-${entry.linkedPost}`,
    placeLabel: entry.placeLabel,
    startsAt: entry.startsInHours === null ? null : shift(entry.startsInHours),
    expiresAt: entry.startsInHours === null ? null : shift(entry.startsInHours + 6),
    capacity: entry.capacity,
    audience: 'all',
    state: 'open',
    createdAt: ago(entry.hoursAgo),
    demo: true,
  }));

  const participants: Participant[] = DEMO_SIGNALS.flatMap((entry) =>
    entry.participants.map((key) => ({
      signalId: `sig-${entry.key}`,
      userId: userId(key),
      state: 'joined' as const,
      joinedAt: ago(entry.hoursAgo - 2),
    })),
  );

  // One accepted exchange, so the threads surface has something real in it.
  const responses: SignalResponse[] = [
    {
      id: 'resp-seed-1',
      signalId: `sig-${DEMO_THREAD.signal}`,
      responderId: userId(DEMO_THREAD.responder),
      message: DEMO_THREAD.responseMessage,
      state: 'accepted',
      createdAt: ago(40),
    },
  ];
  const threads: Thread[] = [
    {
      id: 'thr-seed-1',
      signalId: `sig-${DEMO_THREAD.signal}`,
      responseId: 'resp-seed-1',
      participantIds: [userId('marc'), userId(DEMO_THREAD.responder)],
      state: 'open',
      createdAt: ago(39),
    },
  ];
  const messages: Message[] = [
    {
      id: 'msg-seed-1',
      threadId: 'thr-seed-1',
      authorId: userId(DEMO_THREAD.responder),
      body: DEMO_THREAD.responseMessage,
      createdAt: ago(39),
    },
    {
      id: 'msg-seed-2',
      threadId: 'thr-seed-1',
      authorId: userId('marc'),
      body: DEMO_THREAD.reply,
      createdAt: ago(38),
    },
  ];

  const blocks: BlockEdge[] = DEMO_BLOCKS.map((entry, index) => ({
    id: `blk-seed-${index + 1}`,
    blockerId: userId(entry.blocker),
    blockedId: userId(entry.blocked),
    createdAt: ago(120),
  }));

  const vouches: VouchEvidence[] = DEMO_VOUCHES.map((entry, index) => ({
    id: `vouch-seed-${index + 1}`,
    voucherId: userId(entry.voucher),
    subjectId: userId(entry.subject),
    geoScopeId: CITY_IDS[entry.city],
    statement: entry.statement,
    createdAt: ago(300),
  }));

  const invites: CommunityInvite[] = DEMO_INVITES.map((entry) => ({
    id: `invite-${entry.key}`,
    code: `DEMO${entry.key.toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
    inviterId: userId(entry.inviter),
    geoScopeId: CITY_IDS[entry.city],
    state: entry.acceptedBy === null ? ('issued' as const) : ('accepted' as const),
    acceptedById: entry.acceptedBy === null ? null : userId(entry.acceptedBy),
    createdAt: ago(200),
  }));

  return {
    people,
    attestations,
    scopes: GAZETTEER,
    attachments,
    posts,
    appreciations,
    signals,
    responses,
    participants,
    exclusions: [],
    threads,
    messages,
    blocks,
    reports: [],
    cases: [],
    actions: [],
    invites,
    vouches,
    audit: [],
    analytics: buildDemoAnalytics(),
  };
}

/**
 * Six days of synthetic usage.
 *
 * The shape matters more than the volume: Ajaccio and Kilrush are small but
 * convert (responses, threads, real-world outcomes), Paris is large and
 * converts badly. That is exactly the difference the insights view has to be
 * able to show, so it is worth having in the fixture.
 */
function buildDemoAnalytics(): AnalyticsEvent[] {
  const profile: Record<CityKey, { impressions: number; opens: number; profiles: number; conversions: number }> = {
    ajaccio: { impressions: 60, opens: 24, profiles: 14, conversions: 9 },
    kilrush: { impressions: 18, opens: 9, profiles: 6, conversions: 5 },
    marseille: { impressions: 44, opens: 15, profiles: 8, conversions: 4 },
    porto: { impressions: 26, opens: 10, profiles: 5, conversions: 3 },
    bastia: { impressions: 20, opens: 7, profiles: 4, conversions: 2 },
    montpellier: { impressions: 22, opens: 6, profiles: 3, conversions: 1 },
    lyon: { impressions: 30, opens: 8, profiles: 3, conversions: 1 },
    paris: { impressions: 120, opens: 22, profiles: 9, conversions: 1 },
  };

  const events: AnalyticsEvent[] = [];
  let sequence = 0;
  const emit = (
    name: Parameters<typeof buildAnalyticsEvent>[1]['name'],
    city: CityKey,
    actorKey: string,
    hoursAgo: number,
    extra: { practice?: string | null; signalType?: 'ask' | 'offer' | 'join' | 'event' | null } = {},
  ): void => {
    sequence += 1;
    events.push(
      buildAnalyticsEvent(`evt-seed-${String(sequence).padStart(4, '0')}`, {
        name,
        at: ago(hoursAgo),
        actorId: userId(actorKey),
        geoScopeId: CITY_IDS[city],
        practice: extra.practice ?? null,
        signalType: extra.signalType ?? null,
      }),
    );
  };

  for (const [city, counts] of Object.entries(profile) as [CityKey, (typeof profile)[CityKey]][]) {
    const locals = DEMO_PEOPLE.filter((person) => person.places.some((place) => place.city === city));
    const cast = (locals.length > 0 ? locals : DEMO_PEOPLE).map((person) => person.key);
    const citySignals = DEMO_SIGNALS.filter((entry) => entry.city === city);
    const pick = <T>(list: readonly T[], index: number): T => list[index % list.length] as T;

    for (let index = 0; index < counts.impressions; index += 1) {
      emit('discover_impression', city, pick(cast, index), 6 + (index % 6) * 24);
    }
    for (let index = 0; index < counts.opens; index += 1) {
      const post = DEMO_POSTS.filter((entry) => entry.city === city)[index % Math.max(1, DEMO_POSTS.filter((entry) => entry.city === city).length)];
      emit('content_open', city, pick(cast, index + 1), 7 + (index % 5) * 24, {
        practice: post?.practice ?? null,
      });
    }
    for (let index = 0; index < counts.profiles; index += 1) {
      emit('profile_open', city, pick(cast, index + 2), 8 + (index % 4) * 24);
    }
    for (let index = 0; index < counts.conversions; index += 1) {
      const signal = citySignals.length > 0 ? pick(citySignals, index) : null;
      const names = ['appreciation_created', 'signal_created', 'signal_response', 'thread_started', 'participant_joined', 'local_outcome_recorded'] as const;
      emit(pick(names, index), city, pick(cast, index + 3), 9 + (index % 5) * 24, {
        practice: signal?.practice ?? null,
        signalType: signal?.type ?? null,
      });
    }
  }
  return events;
}

/**
 * Ports wired to the demo dataset: fixed clock, sequential ids. Deterministic
 * by construction, so the same interaction always produces the same state.
 */
export function createDemoPorts(seed: SeedData = buildDemoDataset()): Ports {
  const repo = createInMemoryRepository(seed);
  let counter = 0;
  return {
    repo,
    now: () => DEMO_NOW,
    newId: (prefix: string) => {
      counter += 1;
      return `${prefix}-d${String(counter).padStart(4, '0')}`;
    },
  };
}
