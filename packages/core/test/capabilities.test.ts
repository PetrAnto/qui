import { describe, expect, it } from 'vitest';

import { canPublishInGeo, canVouch, deriveCapabilities, type EvidenceBundle } from '../src/policy/capabilities';
import { createSafetyGraph } from '../src/policy/graph';
import { actor, person, T0 } from './fixtures';

const CITY = 'geo:city:test';
const OTHER = 'geo:city:other';

function evidence(overrides: Partial<EvidenceBundle> = {}): EvidenceBundle {
  return { attestations: [], attachments: [], vouches: [], ...overrides };
}

function attestation(kind: string, geoScopeId: string | null = null) {
  return {
    id: `att-${kind}`,
    subjectId: 'u1',
    kind: kind as never,
    geoScopeId,
    result: 'verified' as const,
    method: 'demo' as const,
    providerRef: null,
    ageThreshold: null,
    country: null,
    issuedAt: T0,
    expiresAt: null,
  };
}

describe('trust evidence to capabilities', () => {
  it('grants nothing without verified evidence', () => {
    expect([...deriveCapabilities(person('u1'), evidence())]).toEqual([]);
  });

  it('grants publishing and responding from an email attestation alone', () => {
    const capabilities = deriveCapabilities(person('u1'), evidence({ attestations: [attestation('email_verified')] }));
    expect([...capabilities].sort()).toEqual(
      ['appear_in_people_discovery', 'invite', 'publish', 'respond_to_unknown_people'].sort(),
    );
  });

  it('grants hosting only to adults with a real tie to a place', () => {
    const evidenceWithHome = evidence({
      attestations: [attestation('email_verified')],
      attachments: [{ userId: 'u1', geoScopeId: CITY, kind: 'resident', evidence: 'declared', since: T0 }],
    });
    expect(deriveCapabilities(person('u1'), evidenceWithHome).has('host')).toBe(true);
    expect(
      deriveCapabilities(person('u1', { ageBand: 'minor_15_17' }), evidenceWithHome).has('host'),
    ).toBe(false);
  });

  it('strips every capability from a suspended account', () => {
    const capabilities = deriveCapabilities(
      person('u1', { accountState: 'suspended' }),
      evidence({ attestations: [attestation('email_verified')] }),
    );
    expect(capabilities.size).toBe(0);
  });

  it('keeps a restricted account able to act but out of people discovery', () => {
    const capabilities = deriveCapabilities(
      person('u1', { accountState: 'distribution_restricted' }),
      evidence({ attestations: [attestation('email_verified')] }),
    );
    expect(capabilities.has('publish')).toBe(true);
    expect(capabilities.has('appear_in_people_discovery')).toBe(false);
  });

  it('is not a ladder: local publishing and hosting are independent dimensions', () => {
    // Verified email, no local tie: can publish, cannot host.
    const explorer = deriveCapabilities(person('u1'), evidence({ attestations: [attestation('email_verified')] }));
    expect(explorer.has('publish')).toBe(true);
    expect(explorer.has('host')).toBe(false);
    // Local tie, no verified email: can host, cannot publish.
    const localOnly = deriveCapabilities(
      person('u2'),
      evidence({
        attachments: [{ userId: 'u2', geoScopeId: CITY, kind: 'resident', evidence: 'declared', since: T0 }],
      }),
    );
    expect(localOnly.has('host')).toBe(true);
    expect(localOnly.has('publish')).toBe(false);
  });
});

describe('publishing into a place', () => {
  const publisher = actor('u1', { capabilities: ['publish'] });

  it('refuses a city the person only explores', () => {
    const result = canPublishInGeo(
      publisher,
      CITY,
      evidence({
        attachments: [{ userId: 'u1', geoScopeId: CITY, kind: 'exploring', evidence: 'declared', since: T0 }],
      }),
    );
    expect(result).toEqual({ allowed: false, reason: 'no_local_attachment' });
  });

  it('accepts a declared resident tie', () => {
    expect(
      canPublishInGeo(
        publisher,
        CITY,
        evidence({
          attachments: [{ userId: 'u1', geoScopeId: CITY, kind: 'resident', evidence: 'declared', since: T0 }],
        }),
      ).allowed,
    ).toBe(true);
  });

  it('accepts two independent vouches in the same place', () => {
    const vouch = (voucherId: string, geoScopeId: string) => ({
      id: `v-${voucherId}`,
      voucherId,
      subjectId: 'u1',
      geoScopeId,
      statement: 'known locally',
      createdAt: T0,
    });
    expect(canPublishInGeo(publisher, CITY, evidence({ vouches: [vouch('a', CITY)] })).allowed).toBe(false);
    // The same voucher twice is still one voucher.
    expect(
      canPublishInGeo(publisher, CITY, evidence({ vouches: [vouch('a', CITY), vouch('a', CITY)] })).allowed,
    ).toBe(false);
    expect(
      canPublishInGeo(publisher, CITY, evidence({ vouches: [vouch('a', CITY), vouch('b', CITY)] })).allowed,
    ).toBe(true);
    // Vouches are scoped to the place they were given for.
    expect(
      canPublishInGeo(publisher, CITY, evidence({ vouches: [vouch('a', OTHER), vouch('b', OTHER)] })).allowed,
    ).toBe(false);
  });
});

describe('vouching', () => {
  const graph = createSafetyGraph([{ id: 'b1', blockerId: 'a', blockedId: 'b', createdAt: T0 }]);

  it('needs the vouch capability, and never applies to oneself or across a block', () => {
    const voucher = actor('a', { capabilities: ['vouch'] });
    expect(canVouch(voucher, actor('c'), false).allowed).toBe(true);
    expect(canVouch(voucher, voucher, false)).toEqual({ allowed: false, reason: 'self' });
    expect(canVouch(voucher, actor('b'), graph.isBlockedBetween('a', 'b'))).toEqual({
      allowed: false,
      reason: 'blocked',
    });
    expect(canVouch(actor('d', { capabilities: [] }), actor('c'), false)).toEqual({
      allowed: false,
      reason: 'missing_capability',
    });
  });
});
