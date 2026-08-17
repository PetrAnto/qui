import type { EvidenceBundle } from './policy/capabilities';
import type { AnalyticsEvent } from './analytics/events';
import type {
  Appreciation,
  Attestation,
  AuditEvent,
  BlockEdge,
  CommunityInvite,
  GeoAttachment,
  GeoScope,
  GeoScopeId,
  HostExclusion,
  Instant,
  Message,
  ModerationAction,
  ModerationCase,
  Participant,
  Person,
  Post,
  PostId,
  Report,
  Signal,
  SignalId,
  SignalResponse,
  Thread,
  ThreadId,
  UserId,
  VouchEvidence,
} from './types';

/**
 * Persistence boundary (ADR-0011).
 *
 * Async and id-addressed throughout so the D1/Drizzle implementation can slot
 * in behind it without touching a single caller. Nothing above this interface
 * knows whether the data lives in a Map or in SQLite, and no query language
 * leaks through it.
 *
 * Deliberately *not* here: any method that returns a person's coordinates,
 * because no such column exists (INV-GEO-1).
 */
export interface Repository {
  // people ------------------------------------------------------------------
  listPeople(): Promise<readonly Person[]>;
  getPerson(id: UserId): Promise<Person | null>;
  getPersonByHandle(handle: string): Promise<Person | null>;
  putPerson(person: Person): Promise<Person>;

  // trust evidence ----------------------------------------------------------
  evidenceFor(userId: UserId): Promise<EvidenceBundle>;
  putAttestation(attestation: Attestation): Promise<void>;

  // geography ---------------------------------------------------------------
  listGeoScopes(): Promise<readonly GeoScope[]>;
  getGeoScope(id: GeoScopeId): Promise<GeoScope | null>;
  listAttachments(userId: UserId): Promise<readonly GeoAttachment[]>;
  putAttachment(attachment: GeoAttachment): Promise<void>;
  deleteAttachment(userId: UserId, geoScopeId: GeoScopeId): Promise<void>;

  // content -----------------------------------------------------------------
  listPosts(filter?: { readonly geoScopeIds?: readonly GeoScopeId[] }): Promise<readonly Post[]>;
  getPost(id: PostId): Promise<Post | null>;
  putPost(post: Post): Promise<Post>;
  listAppreciations(postId?: PostId): Promise<readonly Appreciation[]>;
  putAppreciation(appreciation: Appreciation): Promise<void>;
  deleteAppreciation(postId: PostId, actorId: UserId): Promise<void>;

  // signals -----------------------------------------------------------------
  listSignals(filter?: { readonly geoScopeIds?: readonly GeoScopeId[] }): Promise<readonly Signal[]>;
  getSignal(id: SignalId): Promise<Signal | null>;
  putSignal(signal: Signal): Promise<Signal>;
  listResponses(filter?: { readonly signalId?: SignalId }): Promise<readonly SignalResponse[]>;
  getResponse(id: string): Promise<SignalResponse | null>;
  putResponse(response: SignalResponse): Promise<void>;
  listParticipants(signalId?: SignalId): Promise<readonly Participant[]>;
  putParticipant(participant: Participant): Promise<void>;
  listHostExclusions(): Promise<readonly HostExclusion[]>;
  putHostExclusion(exclusion: HostExclusion): Promise<void>;

  // scoped interaction ------------------------------------------------------
  listThreads(userId?: UserId): Promise<readonly Thread[]>;
  getThread(id: ThreadId): Promise<Thread | null>;
  putThread(thread: Thread): Promise<void>;
  listMessages(threadId: ThreadId): Promise<readonly Message[]>;
  putMessage(message: Message): Promise<void>;

  // safety ------------------------------------------------------------------
  listBlocks(): Promise<readonly BlockEdge[]>;
  putBlock(block: BlockEdge): Promise<void>;
  deleteBlock(blockerId: UserId, blockedId: UserId): Promise<void>;
  listReports(): Promise<readonly Report[]>;
  putReport(report: Report): Promise<void>;
  listModerationCases(): Promise<readonly ModerationCase[]>;
  putModerationCase(moderationCase: ModerationCase): Promise<void>;
  putModerationAction(action: ModerationAction): Promise<void>;

  // community ---------------------------------------------------------------
  listInvites(): Promise<readonly CommunityInvite[]>;
  putInvite(invite: CommunityInvite): Promise<void>;
  listVouches(subjectId?: UserId): Promise<readonly VouchEvidence[]>;
  putVouch(vouch: VouchEvidence): Promise<void>;

  // observability -----------------------------------------------------------
  appendAudit(event: AuditEvent): Promise<void>;
  listAudit(): Promise<readonly AuditEvent[]>;
  appendAnalytics(event: AnalyticsEvent): Promise<void>;
  listAnalytics(): Promise<readonly AnalyticsEvent[]>;
}

/**
 * Everything non-deterministic a service is allowed to touch. Injecting the
 * clock and the id source is what lets the whole domain be tested without a
 * single mock and seeded without a single random value.
 */
export interface Ports {
  readonly repo: Repository;
  now(): Instant;
  newId(prefix: string): string;
}
