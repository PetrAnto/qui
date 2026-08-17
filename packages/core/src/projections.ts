import type { EvidenceBundle } from './policy/capabilities';
import type {
  GeoScope,
  MediaAsset,
  Person,
  Post,
  Signal,
  SignalType,
  UserId,
} from './types';

/**
 * Wire shapes.
 *
 * Nothing in this file is allowed to widen. Every API response and every server
 * component prop is built from these functions, so the safety tests only have
 * to police one boundary instead of forty. Fields that must never cross it:
 * age band, date of birth, account state, raw attestations, provider
 * references, email, and any coordinate attached to a person (INV-GEO-1,
 * INV-PROFILE-1, INV-KYC-2).
 */

/** Coarse, human-readable trust signals. Never a score, never a level. */
export interface TrustSignals {
  readonly emailVerified: boolean;
  readonly identityVerified: boolean;
  readonly localPresence: boolean;
  readonly communityVouched: boolean;
  readonly organizationRole: boolean;
}

export interface PublicProfile {
  readonly id: UserId;
  readonly handle: string;
  readonly displayName: string;
  readonly avatar: MediaAsset;
  readonly bio: string;
  readonly practices: readonly string[];
  readonly interests: readonly string[];
  readonly canHelpWith: readonly string[];
  readonly wantsToLearn: readonly string[];
  /** City names with the relationship kind, never a coordinate. */
  readonly places: readonly { readonly geoScopeId: string; readonly name: string; readonly kind: string }[];
  readonly trust: TrustSignals;
  readonly demo: true;
}

export interface PublicPost {
  readonly id: string;
  readonly caption: string;
  readonly practice: string | null;
  readonly media: MediaAsset;
  readonly createdAt: string;
  readonly geoScopeId: string;
  readonly cityName: string;
  readonly author: PublicAuthor;
  readonly appreciations: number;
  readonly viewerAppreciated: boolean;
  readonly demo: true;
}

export interface PublicAuthor {
  readonly id: UserId;
  readonly handle: string;
  readonly displayName: string;
  readonly avatar: MediaAsset;
}

export interface PublicSignal {
  readonly id: string;
  readonly type: SignalType;
  readonly title: string;
  readonly body: string;
  readonly practice: string | null;
  readonly placeLabel: string | null;
  readonly startsAt: string | null;
  readonly expiresAt: string | null;
  readonly capacity: number | null;
  readonly joinedCount: number;
  readonly state: Signal['state'];
  readonly geoScopeId: string;
  readonly cityName: string;
  readonly linkedPostId: string | null;
  readonly creator: PublicAuthor;
  readonly createdAt: string;
  readonly demo: true;
}

function trustSignalsFrom(evidence: EvidenceBundle): TrustSignals {
  const verified = (kind: string): boolean =>
    evidence.attestations.some((a) => a.kind === kind && a.result === 'verified');
  return {
    emailVerified: verified('email_verified'),
    identityVerified: verified('identity_verified'),
    localPresence:
      verified('local_presence_verified') ||
      evidence.attachments.some((a) => a.kind === 'resident' || a.kind === 'work_study'),
    communityVouched: evidence.vouches.length > 0 || verified('community_vouched'),
    organizationRole: verified('organization_role_verified'),
  };
}

export function toPublicAuthor(person: Person): PublicAuthor {
  return {
    id: person.id,
    handle: person.handle,
    displayName: person.displayName,
    avatar: person.avatar,
  };
}

export function toPublicProfile(
  person: Person,
  evidence: EvidenceBundle,
  scopes: ReadonlyMap<string, GeoScope>,
): PublicProfile {
  return {
    id: person.id,
    handle: person.handle,
    displayName: person.displayName,
    avatar: person.avatar,
    bio: person.bio,
    practices: person.practices,
    interests: person.interests,
    canHelpWith: person.canHelpWith,
    wantsToLearn: person.wantsToLearn,
    places: evidence.attachments.map((attachment) => ({
      geoScopeId: attachment.geoScopeId,
      name: scopes.get(attachment.geoScopeId)?.name ?? 'Unknown place',
      kind: attachment.kind,
    })),
    trust: trustSignalsFrom(evidence),
    demo: true,
  };
}

export function toPublicPost(
  post: Post,
  author: Person,
  cityName: string,
  appreciations: number,
  viewerAppreciated: boolean,
): PublicPost {
  return {
    id: post.id,
    caption: post.caption,
    practice: post.practice,
    media: post.media,
    createdAt: post.createdAt,
    geoScopeId: post.geoScopeId,
    cityName,
    author: toPublicAuthor(author),
    appreciations,
    viewerAppreciated,
    demo: true,
  };
}

export function toPublicSignal(
  signal: Signal,
  creator: Person,
  cityName: string,
  joinedCount: number,
): PublicSignal {
  return {
    id: signal.id,
    type: signal.type,
    title: signal.title,
    body: signal.body,
    practice: signal.practice,
    placeLabel: signal.placeLabel,
    startsAt: signal.startsAt,
    expiresAt: signal.expiresAt,
    capacity: signal.capacity,
    joinedCount,
    state: signal.state,
    geoScopeId: signal.geoScopeId,
    cityName,
    linkedPostId: signal.linkedPostId,
    creator: toPublicAuthor(creator),
    createdAt: signal.createdAt,
    demo: true,
  };
}
