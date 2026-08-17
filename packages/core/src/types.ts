/**
 * Canonical domain types.
 *
 * Everything the product treats as a rule lives in `policy/`. This file only
 * describes shapes. Two rules are encoded structurally here rather than in
 * policy code, because a type that cannot express a thing is a stronger
 * guarantee than a check that can be forgotten:
 *
 *  - there is no romantic/dating signal type (INV-ROMANCE-1);
 *  - no person-attached shape carries coordinates (INV-GEO-1).
 */

export type UserId = string;
export type PostId = string;
export type SignalId = string;
export type ThreadId = string;
export type GeoScopeId = string;

/** ISO-8601 UTC instant. */
export type Instant = string;

// ---------------------------------------------------------------------------
// Age
// ---------------------------------------------------------------------------

/**
 * BASELINE (ADR-0002): 15 is the minimum age for an account.
 * Below this the product does not create an account at all.
 */
export const MINIMUM_AGE_YEARS = 15;

/**
 * Age is stored as a band, never as a date of birth. The onboarding flow
 * converts a declared/attested age into a band and discards the input.
 */
export type AgeBand = 'minor_15_17' | 'adult_18_plus';

export type AccountState = 'active' | 'suspended' | 'distribution_restricted';

// ---------------------------------------------------------------------------
// Trust evidence
// ---------------------------------------------------------------------------

export type AttestationKind =
  | 'email_verified'
  | 'age_threshold_verified'
  | 'identity_verified'
  | 'local_presence_verified'
  | 'community_vouched'
  | 'organization_role_verified'
  | 'social_account_verified';

export type AttestationMethod =
  | 'demo'
  | 'self_declared'
  | 'provider_sandbox'
  | 'provider_live'
  | 'community';

/**
 * The complete set of fields we are willing to persist about an identity or age
 * check. There is deliberately no field able to hold a document image, a
 * document number, a full date of birth or an address (INV-KYC-1).
 */
export interface Attestation {
  readonly id: string;
  readonly subjectId: UserId;
  readonly kind: AttestationKind;
  /** Scope the evidence applies to, when it is geographic. */
  readonly geoScopeId: GeoScopeId | null;
  readonly result: 'verified' | 'failed' | 'pending';
  readonly method: AttestationMethod;
  /** Opaque provider reference. Never a document identifier. */
  readonly providerRef: string | null;
  /** Only the threshold that was checked, never the age itself. */
  readonly ageThreshold: 15 | 18 | null;
  /** ISO-3166-1 alpha-2, only where a jurisdiction rule needs it. */
  readonly country: string | null;
  readonly issuedAt: Instant;
  readonly expiresAt: Instant | null;
}

export const CAPABILITIES = [
  'publish',
  'publish_local',
  'host',
  'appear_in_people_discovery',
  'respond_to_unknown_people',
  'vouch',
  'invite',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

export type GeoScopeKind = 'country' | 'region' | 'city' | 'neighbourhood';

export interface GeoProvenance {
  readonly source: 'geonames' | 'curated';
  readonly sourceId: string | null;
  /**
   * False when the identifier was hand-entered and has not been checked
   * against the official export yet. See docs/GEO_PROVENANCE.md.
   */
  readonly verified: boolean;
}

/**
 * Administrative geography. A scope is a *place*, so it may carry a centroid.
 * People never do.
 */
export interface GeoScope {
  readonly id: GeoScopeId;
  readonly kind: GeoScopeKind;
  readonly name: string;
  readonly parentId: GeoScopeId | null;
  readonly countryCode: string;
  readonly timezone: string | null;
  readonly centroid: { readonly lat: number; readonly lng: number } | null;
  readonly provenance: GeoProvenance;
}

/**
 * How a person relates to a place. "exploring" is the default and grants no
 * local publishing capability; stronger kinds require evidence.
 */
export type GeoAttachmentKind =
  | 'exploring'
  | 'visitor'
  | 'recent_presence'
  | 'repeated_presence'
  | 'resident'
  | 'work_study'
  | 'second_home'
  | 'origin_family'
  | 'other';

export type GeoEvidenceStrength = 'declared' | 'vouched' | 'attested';

export interface GeoAttachment {
  readonly userId: UserId;
  readonly geoScopeId: GeoScopeId;
  readonly kind: GeoAttachmentKind;
  readonly evidence: GeoEvidenceStrength;
  readonly since: Instant;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface Person {
  readonly id: UserId;
  readonly handle: string;
  readonly displayName: string;
  readonly avatar: MediaAsset;
  readonly bio: string;
  readonly ageBand: AgeBand;
  readonly accountState: AccountState;
  /** Platform role. Hosts are *not* moderators (ADR-0010). */
  readonly role: 'member' | 'moderator';
  readonly practices: readonly string[];
  readonly interests: readonly string[];
  readonly canHelpWith: readonly string[];
  readonly wantsToLearn: readonly string[];
  readonly createdAt: Instant;
  /** Every account in this build is synthetic. See docs/PRODUCT.md §demo data. */
  readonly demo: true;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/**
 * Media in this build is generated locally (deterministic gradient artwork),
 * so there is no upload path and no EXIF to strip yet. The shape already
 * carries the flags the real pipeline must set.
 */
export interface MediaAsset {
  readonly id: string;
  readonly kind: 'image';
  readonly alt: string;
  /** Deterministic art seed; a real asset would carry a delivery id instead. */
  readonly seed: string;
  readonly motif: string;
  readonly metadataStripped: boolean;
}

export type ContentAudience = 'all' | 'adults_only';

export type ContentState = 'published' | 'distribution_restricted' | 'removed';

export interface Post {
  readonly id: PostId;
  readonly authorId: UserId;
  readonly geoScopeId: GeoScopeId;
  readonly caption: string;
  readonly practice: string | null;
  readonly media: MediaAsset;
  readonly audience: ContentAudience;
  readonly state: ContentState;
  readonly createdAt: Instant;
  readonly demo: true;
}

export interface Appreciation {
  readonly id: string;
  readonly postId: PostId;
  readonly actorId: UserId;
  readonly createdAt: Instant;
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

/**
 * The four MVP intents. Extending this union is how "Learn"/"Teach"/"Project"
 * arrive later. A romantic intent is not deferred — it is out of this product
 * surface entirely (ADR-0009).
 */
export const SIGNAL_TYPES = ['ask', 'offer', 'join', 'event'] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

export type SignalState = 'open' | 'closed' | 'expired' | 'removed';

export interface Signal {
  readonly id: SignalId;
  readonly creatorId: UserId;
  readonly type: SignalType;
  readonly title: string;
  readonly body: string;
  readonly geoScopeId: GeoScopeId;
  readonly practice: string | null;
  /** Set when the signal was created from a piece of content. */
  readonly linkedPostId: PostId | null;
  /** Free-text meeting point. Never a person's home coordinates. */
  readonly placeLabel: string | null;
  readonly startsAt: Instant | null;
  readonly expiresAt: Instant | null;
  readonly capacity: number | null;
  readonly audience: ContentAudience;
  readonly state: SignalState;
  readonly createdAt: Instant;
  readonly demo: true;
}

export type SignalResponseState = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface SignalResponse {
  readonly id: string;
  readonly signalId: SignalId;
  readonly responderId: UserId;
  readonly message: string;
  readonly state: SignalResponseState;
  readonly createdAt: Instant;
}

export type ParticipantState = 'joined' | 'left' | 'removed';

export interface Participant {
  readonly signalId: SignalId;
  readonly userId: UserId;
  readonly state: ParticipantState;
  readonly joinedAt: Instant;
}

/**
 * A host decision scoped to one hosted object. It never becomes a
 * platform-wide power (ADR-0010).
 */
export interface HostExclusion {
  readonly signalId: SignalId;
  readonly userId: UserId;
  readonly byHostId: UserId;
  readonly reason: string;
  readonly at: Instant;
}

// ---------------------------------------------------------------------------
// Scoped interaction
// ---------------------------------------------------------------------------

/**
 * Threads only exist as a consequence of an accepted signal response. There is
 * no constructor for a context-free thread (INV-DM-1).
 */
export interface Thread {
  readonly id: ThreadId;
  readonly signalId: SignalId;
  readonly responseId: string;
  readonly participantIds: readonly UserId[];
  readonly state: 'open' | 'closed';
  readonly createdAt: Instant;
}

export interface Message {
  readonly id: string;
  readonly threadId: ThreadId;
  readonly authorId: UserId;
  readonly body: string;
  readonly createdAt: Instant;
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

export interface BlockEdge {
  readonly id: string;
  readonly blockerId: UserId;
  readonly blockedId: UserId;
  readonly createdAt: Instant;
}

export type ReportReason =
  | 'harassment'
  | 'doxxing'
  | 'minor_safety'
  | 'sexual_content'
  | 'spam'
  | 'impersonation'
  | 'violence'
  | 'other';

export type ReportTargetType = 'post' | 'signal' | 'user' | 'message';

export interface Report {
  readonly id: string;
  readonly reporterId: UserId;
  readonly targetType: ReportTargetType;
  readonly targetId: string;
  readonly reason: ReportReason;
  readonly note: string;
  readonly caseId: string;
  readonly createdAt: Instant;
}

export type ModerationCaseState = 'open' | 'triaged' | 'actioned' | 'dismissed';

export interface ModerationCase {
  readonly id: string;
  readonly targetType: ReportTargetType;
  readonly targetId: string;
  readonly state: ModerationCaseState;
  readonly reportIds: readonly string[];
  /** Machine triage hints only. Never the sole basis for an action. */
  readonly triageLabels: readonly string[];
  readonly createdAt: Instant;
}

export type ModerationActionKind =
  | 'none'
  | 'content_removed'
  | 'distribution_restricted'
  | 'account_suspended';

export interface ModerationAction {
  readonly id: string;
  readonly caseId: string;
  readonly kind: ModerationActionKind;
  readonly actorId: UserId;
  readonly rationale: string;
  /** Restrictions are time-bounded unless a human renews them (§18). */
  readonly expiresAt: Instant | null;
  readonly at: Instant;
}

export interface AuditEvent {
  readonly id: string;
  readonly at: Instant;
  readonly actorId: UserId | null;
  readonly action: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
}

// ---------------------------------------------------------------------------
// Community invitation / vouching
// ---------------------------------------------------------------------------

export interface CommunityInvite {
  readonly id: string;
  readonly code: string;
  readonly inviterId: UserId;
  readonly geoScopeId: GeoScopeId;
  readonly state: 'issued' | 'accepted' | 'revoked';
  readonly acceptedById: UserId | null;
  readonly createdAt: Instant;
}

/**
 * One trust input among several. A vouch is not identity verification and not
 * proof of residence (ADR-0003).
 */
export interface VouchEvidence {
  readonly id: string;
  readonly voucherId: UserId;
  readonly subjectId: UserId;
  readonly geoScopeId: GeoScopeId;
  readonly statement: string;
  readonly createdAt: Instant;
}

export interface OrganizationRole {
  readonly id: string;
  readonly userId: UserId;
  readonly organizationName: string;
  readonly geoScopeId: GeoScopeId;
  readonly role: string;
  readonly verified: boolean;
}
