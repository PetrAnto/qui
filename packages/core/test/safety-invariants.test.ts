import { describe, expect, it } from 'vitest';

import { CAPABILITIES, MINIMUM_AGE_YEARS, SIGNAL_TYPES } from '../src/types';
import { ageBandFromAge, isAgeEligible } from '../src/policy/age';
import { createSafetyGraph } from '../src/policy/graph';
import {
  canAppreciate,
  canDiscoverUser,
  canViewMedia,
  canViewModerationCase,
  canViewPost,
  canViewProfile,
  canViewReport,
} from '../src/policy/access';
import {
  canContact,
  canExerciseHostPower,
  canJoinEvent,
  canOpenScopedThread,
  canRespondToSignal,
  canSendMessage,
  visibleParticipants,
} from '../src/policy/interaction';
import { acceptAttestation } from '../src/identity/intake';
import { toPublicPost, toPublicProfile, toPublicSignal } from '../src/projections';
import { rankDiscover } from '../src/ranking';
import * as services from '../src/services';
import { actor, person, post, signal, T0, T1 } from './fixtures';

const NOW = '2026-03-03T09:00:00.000Z';

/**
 * These are the executable safety invariants. Each `INV-` test corresponds to a
 * numbered invariant in docs/SAFETY.md. Changing one of them requires an ADR
 * and a security justification (see AGENTS.md).
 */

describe('INV-AGE-1 minimum age', () => {
  it('refuses to produce an age band below the baseline', () => {
    expect(MINIMUM_AGE_YEARS).toBe(15);
    expect(ageBandFromAge(14)).toBeNull();
    expect(ageBandFromAge(0)).toBeNull();
    expect(ageBandFromAge(Number.NaN)).toBeNull();
    expect(isAgeEligible(14)).toBe(false);
  });

  it('bands eligible ages without keeping the age itself', () => {
    expect(ageBandFromAge(15)).toBe('minor_15_17');
    expect(ageBandFromAge(17)).toBe('minor_15_17');
    expect(ageBandFromAge(18)).toBe('adult_18_plus');
    expect(ageBandFromAge(64)).toBe('adult_18_plus');
  });
});

describe('INV-AGE-2 no private space across age bands', () => {
  const graph = createSafetyGraph([]);
  const adult = actor('adult');
  const minor = actor('minor', { ageBand: 'minor_15_17' });

  it('blocks an adult from responding to a minor Ask', () => {
    const ask = signal('s1', minor.id, 'ask');
    expect(canRespondToSignal(adult, ask, minor, graph, NOW)).toEqual({
      allowed: false,
      reason: 'age_band_mismatch',
    });
  });

  it('blocks a minor from responding to an adult Offer', () => {
    const offer = signal('s2', adult.id, 'offer');
    expect(canRespondToSignal(minor, offer, adult, graph, NOW)).toEqual({
      allowed: false,
      reason: 'age_band_mismatch',
    });
  });

  it('refuses to open the thread even if a response somehow reached accepted', () => {
    expect(
      canOpenScopedThread(
        adult,
        minor,
        { signalType: 'ask', response: { state: 'accepted', signalId: 's1' } },
        graph,
      ),
    ).toEqual({ allowed: false, reason: 'age_band_mismatch' });
  });

  it('still allows a hosted group activity to mix age bands', () => {
    const event = signal('s3', adult.id, 'event');
    expect(canJoinEvent(minor, event, adult, graph, 0, NOW).allowed).toBe(true);
  });
});

describe('INV-AGE-3 minors are not in people discovery for adults', () => {
  const graph = createSafetyGraph([]);
  it('hides a minor from an adult browsing people', () => {
    const adult = actor('adult');
    const minor = actor('minor', { ageBand: 'minor_15_17' });
    expect(canDiscoverUser(adult, minor, graph)).toEqual({
      allowed: false,
      reason: 'minor_not_discoverable',
    });
    expect(canDiscoverUser(minor, adult, graph).allowed).toBe(true);
  });
});

describe('INV-AGE-4 adult-audience content never reaches a minor', () => {
  const graph = createSafetyGraph([]);
  it('filters an adults_only post out of a minor view', () => {
    const author = actor('author');
    const minor = actor('minor', { ageBand: 'minor_15_17' });
    const restricted = post('p1', author.id, { audience: 'adults_only' });
    expect(canViewPost(minor, restricted, author, graph)).toEqual({
      allowed: false,
      reason: 'adults_only_content',
    });
    expect(canViewMedia(minor, restricted, author, graph).allowed).toBe(false);
  });
});

describe('INV-BLOCK-1 a block removes the account in both directions', () => {
  const a = actor('a');
  const b = actor('b');
  const graph = createSafetyGraph([
    { id: 'b1', blockerId: 'a', blockedId: 'b', createdAt: T0 },
  ]);

  it('is symmetric regardless of who pressed the button', () => {
    expect(graph.isBlockedBetween('a', 'b')).toBe(true);
    expect(graph.isBlockedBetween('b', 'a')).toBe(true);
  });

  it('removes profile, discovery, content and appreciation', () => {
    const theirPost = post('p1', 'b');
    expect(canViewProfile(a, b, graph).reason).toBe('blocked');
    expect(canViewProfile(b, a, graph).reason).toBe('blocked');
    expect(canDiscoverUser(a, b, graph).reason).toBe('blocked');
    expect(canViewPost(a, theirPost, b, graph).reason).toBe('blocked');
    expect(canAppreciate(a, theirPost, b, graph).reason).toBe('blocked');
  });

  it('removes signal eligibility and any new thread', () => {
    const ask = signal('s1', 'b', 'ask');
    expect(canRespondToSignal(a, ask, b, graph, NOW).reason).toBe('blocked');
    expect(
      canOpenScopedThread(a, b, { signalType: 'ask', response: { state: 'accepted', signalId: 's1' } }, graph)
        .reason,
    ).toBe('blocked');
  });

  it('freezes an existing thread', () => {
    const thread = {
      id: 't1',
      signalId: 's1',
      responseId: 'r1',
      participantIds: ['a', 'b'],
      state: 'open' as const,
      createdAt: T0,
    };
    expect(canSendMessage(a, thread, graph).reason).toBe('blocked');
    expect(canSendMessage(b, thread, graph).reason).toBe('blocked');
  });

  it('removes the other account from a participant list projection', () => {
    expect(visibleParticipants(a, ['a', 'b', 'c'], graph)).toEqual(['a', 'c']);
  });

  it('removes blocked content from the ranked feed rather than demoting it', () => {
    const ranked = rankDiscover(
      [
        { post: post('p1', 'b'), author: b, appreciations: 99, localAppreciations: 99 },
        { post: post('p2', 'c'), author: actor('c'), appreciations: 0, localAppreciations: 0 },
      ],
      {
        viewer: a,
        viewerInterests: [],
        activeGeoScopeId: 'geo:city:test',
        followedGeoScopeIds: [],
        graph,
        now: NOW,
      },
    );
    expect(ranked.map((entry) => entry.post.id)).toEqual(['p2']);
  });
});

describe('INV-DM-1 no unsolicited direct messages', () => {
  const graph = createSafetyGraph([]);

  it('offers no service that opens a conversation without a signal', () => {
    const exported = Object.keys(services);
    expect(exported).not.toContain('createThread');
    expect(exported).not.toContain('startConversation');
    expect(exported).not.toContain('sendDirectMessage');
  });

  it('denies contact when the person has no signal open', () => {
    const viewer = actor('viewer');
    const subject = actor('subject');
    expect(
      canContact(viewer, subject, graph, { openThreadId: null, respondableSignal: null }, NOW),
    ).toEqual({ allowed: false, reason: 'no_signal_context' });
  });

  it('refuses to open a thread from a pending or declined response', () => {
    const host = actor('host');
    const responder = actor('responder');
    for (const state of ['pending', 'declined', 'withdrawn'] as const) {
      expect(
        canOpenScopedThread(host, responder, { signalType: 'ask', response: { state, signalId: 's1' } }, graph)
          .reason,
      ).toBe('no_signal_context');
    }
  });

  it('allows contact once a live signal exists', () => {
    const viewer = actor('viewer');
    const subject = actor('subject');
    const ask = signal('s1', subject.id, 'ask');
    expect(
      canContact(viewer, subject, graph, { openThreadId: null, respondableSignal: ask }, NOW).allowed,
    ).toBe(true);
  });
});

describe('INV-HOST-1 host exclusion prevents rejoining the same object', () => {
  const host = actor('host');
  const guest = actor('guest');
  const event = signal('s1', host.id, 'event');
  const graph = createSafetyGraph(
    [],
    [{ signalId: 's1', userId: 'guest', byHostId: 'host', reason: 'disruptive', at: T0 }],
  );

  it('denies both rejoin and any further response on that object', () => {
    expect(canJoinEvent(guest, event, host, graph, 0, NOW)).toEqual({
      allowed: false,
      reason: 'host_excluded',
    });
    expect(canRespondToSignal(guest, event, host, graph, NOW).reason).toBe('host_excluded');
  });

  it('leaves the excluded person able to use every other object', () => {
    const other = signal('s2', host.id, 'event');
    expect(canJoinEvent(guest, other, host, graph, 0, NOW).allowed).toBe(true);
  });
});

describe('INV-HOST-2 host power is local to the hosted object', () => {
  const host = actor('host');
  const stranger = actor('stranger');
  const event = signal('s1', host.id, 'event');

  it('grants powers only to the creator of that object', () => {
    expect(canExerciseHostPower(host, event, 'remove_participant').allowed).toBe(true);
    expect(canExerciseHostPower(stranger, event, 'remove_participant')).toEqual({
      allowed: false,
      reason: 'not_host',
    });
  });

  it('does not turn a host into a moderator', () => {
    const moderationCase = {
      id: 'c1',
      targetType: 'post' as const,
      targetId: 'p1',
      state: 'open' as const,
      reportIds: [],
      triageLabels: [],
      createdAt: T0,
    };
    expect(canViewModerationCase(host, moderationCase)).toEqual({
      allowed: false,
      reason: 'moderation_private',
    });
  });
});

describe('INV-MOD-1 moderation material is private', () => {
  const report = {
    id: 'r1',
    reporterId: 'reporter',
    targetType: 'post' as const,
    targetId: 'p1',
    reason: 'harassment' as const,
    note: 'context',
    caseId: 'c1',
    createdAt: T0,
  };

  it('shows a report only to its author and to moderators', () => {
    expect(canViewReport(actor('reporter'), report).allowed).toBe(true);
    expect(canViewReport(actor('moderator', { role: 'moderator' }), report).allowed).toBe(true);
    expect(canViewReport(actor('reported'), report)).toEqual({
      allowed: false,
      reason: 'moderation_private',
    });
  });
});

describe('INV-KYC-1 identity document material cannot enter the system', () => {
  const context = { id: 'att1', subjectId: 'u1', now: T0, liveProviderEnabled: false };

  it('rejects document and biometric fields by name', () => {
    for (const field of ['documentNumber', 'document_image', 'selfieVideo', 'dateOfBirth', 'homeAddress']) {
      const result = acceptAttestation(
        { kind: 'identity_verified', result: 'verified', [field]: 'x' },
        context,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.rejection).toBe('document_material');
    }
  });

  it('accepts only a provider reference and a threshold result', () => {
    const result = acceptAttestation(
      {
        kind: 'age_threshold_verified',
        result: 'verified',
        method: 'provider_sandbox',
        providerRef: 'ref-123',
        ageThreshold: 18,
        country: 'fr',
      },
      context,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.attestation).sort()).toEqual(
        [
          'ageThreshold',
          'country',
          'expiresAt',
          'geoScopeId',
          'id',
          'issuedAt',
          'kind',
          'method',
          'providerRef',
          'result',
          'subjectId',
        ].sort(),
      );
      expect(result.attestation.country).toBe('FR');
    }
  });

  it('refuses to record a live verification that never happened', () => {
    const result = acceptAttestation(
      { kind: 'identity_verified', result: 'verified', method: 'provider_live' },
      context,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejection).toBe('live_provider_unavailable');
  });
});

describe('INV-SOCIAL-1 third-party credentials are never accepted', () => {
  const context = { id: 'att1', subjectId: 'u1', now: T0, liveProviderEnabled: false };

  it('rejects passwords, tokens and cookies', () => {
    for (const field of ['password', 'instagramPassword', 'accessToken', 'sessionCookie', 'apiKey']) {
      const result = acceptAttestation(
        { kind: 'social_account_verified', result: 'verified', [field]: 'secret-value' },
        context,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.rejection).toBe('plaintext_credential');
    }
  });

  it('rejects unknown fields instead of silently dropping them', () => {
    const result = acceptAttestation(
      { kind: 'email_verified', result: 'verified', extra: 'whatever' },
      context,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejection).toBe('unsupported_field');
  });
});

describe('INV-GEO-1 no person-level location ever leaves the domain', () => {
  const scopes = new Map([
    [
      'geo:city:test',
      {
        id: 'geo:city:test',
        kind: 'city' as const,
        name: 'Testville',
        parentId: null,
        countryCode: 'FR',
        timezone: 'Europe/Paris',
        centroid: { lat: 41.9, lng: 8.7 },
        provenance: { source: 'curated' as const, sourceId: null, verified: false },
      },
    ],
  ]);

  const forbidden = /(^|_|\.)(lat|lng|latitude|longitude|coords?|geohash|h3|gps|address|dob|dateofbirth|ageband|email|providerref|accountstate)($|_)/i;

  function scanKeys(value: unknown, path: string[] = []): string[] {
    if (value === null || typeof value !== 'object') return [];
    if (Array.isArray(value)) return value.flatMap((entry) => scanKeys(entry, path));
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => [
      ...(forbidden.test(key) ? [[...path, key].join('.')] : []),
      ...scanKeys(entry, [...path, key]),
    ]);
  }

  it('exposes no coordinate or identity field on a public profile', () => {
    const profile = toPublicProfile(
      person('u1', { ageBand: 'minor_15_17' }),
      {
        attestations: [
          {
            id: 'a1',
            subjectId: 'u1',
            kind: 'identity_verified',
            geoScopeId: null,
            result: 'verified',
            method: 'provider_sandbox',
            providerRef: 'ref-should-not-leak',
            ageThreshold: 18,
            country: 'FR',
            issuedAt: T0,
            expiresAt: null,
          },
        ],
        attachments: [
          { userId: 'u1', geoScopeId: 'geo:city:test', kind: 'resident', evidence: 'declared', since: T0 },
        ],
        vouches: [],
      },
      scopes,
    );
    expect(scanKeys(profile)).toEqual([]);
    expect(JSON.stringify(profile)).not.toContain('ref-should-not-leak');
    expect(profile.places[0]?.name).toBe('Testville');
  });

  it('exposes no coordinate on public content or signals', () => {
    expect(scanKeys(toPublicPost(post('p1', 'u1'), person('u1'), 'Testville', 0, false))).toEqual([]);
    expect(
      scanKeys(toPublicSignal(signal('s1', 'u1', 'event', { placeLabel: 'Place Foch' }), person('u1'), 'Testville', 0)),
    ).toEqual([]);
  });
});

describe('INV-PROFILE-1 private trust state stays private', () => {
  it('reduces attestations to coarse booleans', () => {
    const profile = toPublicProfile(
      person('u1'),
      {
        attestations: [
          {
            id: 'a1',
            subjectId: 'u1',
            kind: 'email_verified',
            geoScopeId: null,
            result: 'verified',
            method: 'demo',
            providerRef: null,
            ageThreshold: null,
            country: null,
            issuedAt: T0,
            expiresAt: null,
          },
        ],
        attachments: [],
        vouches: [],
      },
      new Map(),
    );
    expect(profile.trust).toEqual({
      emailVerified: true,
      identityVerified: false,
      localPresence: false,
      communityVouched: false,
      organizationRole: false,
    });
    expect(Object.values(profile.trust).every((value) => typeof value === 'boolean')).toBe(true);
  });
});

describe('INV-ROMANCE-1 current MVP has no romantic surface', () => {
  it('has no romantic intent in the signal vocabulary', () => {
    expect([...SIGNAL_TYPES]).toEqual(['ask', 'offer', 'join', 'event']);
    for (const type of SIGNAL_TYPES) {
      expect(/(romantic|dating|flirt|match|swipe)/i.test(type)).toBe(false);
    }
  });

  it('has no romantic capability', () => {
    for (const capability of CAPABILITIES) {
      expect(/(romantic|dating|adult_signal)/i.test(capability)).toBe(false);
    }
  });
});

describe('INV-SUSPEND-1 suspended and restricted accounts respect policy', () => {
  const graph = createSafetyGraph([]);

  it('hides a suspended account and its content', () => {
    const viewer = actor('viewer');
    const suspended = actor('suspended', { accountState: 'suspended' });
    expect(canViewProfile(viewer, suspended, graph).reason).toBe('author_suspended');
    expect(canViewPost(viewer, post('p1', 'suspended'), suspended, graph).reason).toBe('author_suspended');
  });

  it('keeps a distribution-restricted post out of other people feeds but visible to its author', () => {
    const author = actor('author');
    const viewer = actor('viewer');
    const restricted = post('p1', 'author', { state: 'distribution_restricted' });
    expect(canViewPost(viewer, restricted, author, graph).reason).toBe('distribution_restricted');
    expect(canViewPost(author, restricted, author, graph).allowed).toBe(true);
  });

  it('stops a suspended account from responding to anything', () => {
    const suspended = actor('suspended', { accountState: 'suspended' });
    const host = actor('host');
    expect(canRespondToSignal(suspended, signal('s1', 'host'), host, graph, NOW).reason).toBe(
      'account_suspended',
    );
  });
});

describe('signal lifecycle', () => {
  const graph = createSafetyGraph([]);
  it('refuses a closed or expired signal', () => {
    const viewer = actor('viewer');
    const host = actor('host');
    expect(canRespondToSignal(viewer, signal('s1', 'host', 'ask', { state: 'closed' }), host, graph, NOW).reason).toBe(
      'signal_not_open',
    );
    expect(
      canRespondToSignal(viewer, signal('s2', 'host', 'ask', { expiresAt: T1 }), host, graph, NOW).reason,
    ).toBe('signal_not_open');
  });

  it('refuses to overfill a capped event', () => {
    const viewer = actor('viewer');
    const host = actor('host');
    const event = signal('s3', 'host', 'event', { capacity: 2 });
    expect(canJoinEvent(viewer, event, host, graph, 1, NOW).allowed).toBe(true);
    expect(canJoinEvent(viewer, event, host, graph, 2, NOW).reason).toBe('signal_full');
  });
});
