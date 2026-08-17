import type {
  Attestation,
  Capability,
  GeoAttachment,
  GeoAttachmentKind,
  GeoScopeId,
  Person,
  VouchEvidence,
} from '../types';
import { ALLOW, deny, type ActorView, type Decision } from './decision';

/**
 * ADR-0003. Trust is multidimensional evidence, not a ladder and not a score.
 *
 * There is no `trustLevel` field anywhere in this codebase on purpose: a single
 * number invites "level 3 users can do X", which is exactly the social-credit
 * shape the product rejects. Capabilities are derived per dimension, and a
 * person can be strong in one and absent in another.
 */
export interface EvidenceBundle {
  readonly attestations: readonly Attestation[];
  readonly attachments: readonly GeoAttachment[];
  readonly vouches: readonly VouchEvidence[];
}

export const EMPTY_EVIDENCE: EvidenceBundle = Object.freeze({
  attestations: [],
  attachments: [],
  vouches: [],
});

/** Attachment kinds that assert a real, continuing tie to a place. */
const LOCAL_ATTACHMENT_KINDS: ReadonlySet<GeoAttachmentKind> = new Set<GeoAttachmentKind>([
  'resident',
  'work_study',
  'second_home',
  'origin_family',
  'repeated_presence',
]);

/** Two independent vouches stand in for one attested local presence. */
const VOUCHES_FOR_LOCAL_PUBLISHING = 2;

function hasAttestation(
  evidence: EvidenceBundle,
  kind: Attestation['kind'],
  geoScopeId: GeoScopeId | null = null,
): boolean {
  return evidence.attestations.some(
    (attestation) =>
      attestation.kind === kind &&
      attestation.result === 'verified' &&
      (geoScopeId === null || attestation.geoScopeId === geoScopeId),
  );
}

function distinctVouchers(evidence: EvidenceBundle, geoScopeId: GeoScopeId): number {
  const voucherIds = new Set(
    evidence.vouches.filter((vouch) => vouch.geoScopeId === geoScopeId).map((vouch) => vouch.voucherId),
  );
  return voucherIds.size;
}

function hasLocalAttachment(evidence: EvidenceBundle, geoScopeId: GeoScopeId): boolean {
  return evidence.attachments.some(
    (attachment) => attachment.geoScopeId === geoScopeId && LOCAL_ATTACHMENT_KINDS.has(attachment.kind),
  );
}

function anyLocalAttachment(evidence: EvidenceBundle): boolean {
  return evidence.attachments.some((attachment) => LOCAL_ATTACHMENT_KINDS.has(attachment.kind));
}

export function deriveCapabilities(person: Person, evidence: EvidenceBundle): ReadonlySet<Capability> {
  const capabilities = new Set<Capability>();

  // A suspended account keeps no capability at all. Read access is handled
  // separately so a suspended person can still see and appeal their own state.
  if (person.accountState === 'suspended') return capabilities;

  const emailVerified = hasAttestation(evidence, 'email_verified');
  const localPresence = anyLocalAttachment(evidence) || hasAttestation(evidence, 'local_presence_verified');
  const adult = person.ageBand === 'adult_18_plus';
  const restricted = person.accountState === 'distribution_restricted';

  if (emailVerified) {
    capabilities.add('publish');
    capabilities.add('respond_to_unknown_people');
    capabilities.add('invite');
  }
  if (emailVerified && localPresence) {
    capabilities.add('publish_local');
  }
  // Hosting a real-world gathering carries adult responsibility, and a host can
  // exclude people from their own space. Both argue for 18+ in the MVP.
  if (adult && localPresence) {
    capabilities.add('host');
    capabilities.add('vouch');
  }
  // A restricted account keeps its voice but loses amplification: it is not
  // listed in people discovery and its content is filtered out of ranked feeds.
  if (emailVerified && !restricted) {
    capabilities.add('appear_in_people_discovery');
  }

  return capabilities;
}

export function toActorView(person: Person, evidence: EvidenceBundle): ActorView {
  return {
    id: person.id,
    ageBand: person.ageBand,
    accountState: person.accountState,
    role: person.role,
    capabilities: deriveCapabilities(person, evidence),
  };
}

/**
 * Publishing *into* a place is the capability that needs evidence, because it
 * is what lets a stranger speak as a local. Exploring a city needs none.
 */
export function canPublishInGeo(
  actor: ActorView,
  geoScopeId: GeoScopeId,
  evidence: EvidenceBundle,
): Decision {
  if (actor.accountState === 'suspended') return deny('account_suspended');
  if (!actor.capabilities.has('publish')) return deny('missing_capability');

  const attested = hasAttestation(evidence, 'local_presence_verified', geoScopeId);
  const attached = hasLocalAttachment(evidence, geoScopeId);
  const vouched = distinctVouchers(evidence, geoScopeId) >= VOUCHES_FOR_LOCAL_PUBLISHING;

  return attested || attached || vouched ? ALLOW : deny('no_local_attachment');
}

/**
 * A vouch is one trust input. It is not identity verification, not proof of
 * residence, and it grants the voucher no power over the person vouched for.
 */
export function canVouch(voucher: ActorView, subject: ActorView, blocked: boolean): Decision {
  if (voucher.id === subject.id) return deny('self');
  if (blocked) return deny('blocked');
  if (voucher.accountState !== 'active') return deny('account_suspended');
  if (!voucher.capabilities.has('vouch')) return deny('missing_capability');
  return ALLOW;
}

export function canInvite(actor: ActorView): Decision {
  if (actor.accountState === 'suspended') return deny('account_suspended');
  return actor.capabilities.has('invite') ? ALLOW : deny('missing_capability');
}
