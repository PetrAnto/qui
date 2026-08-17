import type {
  AnalyticsEvent,
  Appreciation,
  Attestation,
  AuditEvent,
  BlockEdge,
  CommunityInvite,
  EvidenceBundle,
  GeoAttachment,
  GeoScope,
  HostExclusion,
  Message,
  ModerationAction,
  ModerationCase,
  Participant,
  Person,
  Post,
  Report,
  Repository,
  Signal,
  SignalResponse,
  Thread,
  VouchEvidence,
} from '@indenoi/core';
import { getScope } from '@indenoi/geo';

/**
 * The dataset the repository is built from. The demo seed produces one of
 * these; a future D1 loader would produce the same shape from SQL.
 */
export interface SeedData {
  readonly people: readonly Person[];
  readonly attestations: readonly Attestation[];
  readonly scopes: readonly GeoScope[];
  readonly attachments: readonly GeoAttachment[];
  readonly posts: readonly Post[];
  readonly appreciations: readonly Appreciation[];
  readonly signals: readonly Signal[];
  readonly responses: readonly SignalResponse[];
  readonly participants: readonly Participant[];
  readonly exclusions: readonly HostExclusion[];
  readonly threads: readonly Thread[];
  readonly messages: readonly Message[];
  readonly blocks: readonly BlockEdge[];
  readonly reports: readonly Report[];
  readonly cases: readonly ModerationCase[];
  readonly actions: readonly ModerationAction[];
  readonly invites: readonly CommunityInvite[];
  readonly vouches: readonly VouchEvidence[];
  readonly audit: readonly AuditEvent[];
  readonly analytics: readonly AnalyticsEvent[];
}

export const EMPTY_SEED: SeedData = {
  people: [],
  attestations: [],
  scopes: [],
  attachments: [],
  posts: [],
  appreciations: [],
  signals: [],
  responses: [],
  participants: [],
  exclusions: [],
  threads: [],
  messages: [],
  blocks: [],
  reports: [],
  cases: [],
  actions: [],
  invites: [],
  vouches: [],
  audit: [],
  analytics: [],
};

/**
 * In-memory implementation of the domain `Repository` (ADR-0011).
 *
 * This is the development and demo store. It is intentionally a full, honest
 * implementation of the interface rather than a partial mock: the D1/Drizzle
 * adapter is a drop-in replacement, and every domain test that runs here will
 * run unchanged against it.
 *
 * Its one real limitation is scope: state lives in a single isolate and is lost
 * on restart. That is documented, not hidden — see docs/ARCHITECTURE.md.
 */
export function createInMemoryRepository(seed: SeedData = EMPTY_SEED): Repository {
  const people = new Map(seed.people.map((person) => [person.id, person]));
  const attestations = [...seed.attestations];
  const scopes = new Map(seed.scopes.map((scope) => [scope.id, scope]));
  let attachments = [...seed.attachments];
  const posts = new Map(seed.posts.map((post) => [post.id, post]));
  let appreciations = [...seed.appreciations];
  const signals = new Map(seed.signals.map((signal) => [signal.id, signal]));
  const responses = new Map(seed.responses.map((response) => [response.id, response]));
  let participants = [...seed.participants];
  const exclusions = [...seed.exclusions];
  const threads = new Map(seed.threads.map((thread) => [thread.id, thread]));
  const messages = [...seed.messages];
  let blocks = [...seed.blocks];
  const reports = [...seed.reports];
  const cases = new Map(seed.cases.map((entry) => [entry.id, entry]));
  const actions = [...seed.actions];
  const invites = new Map(seed.invites.map((invite) => [invite.id, invite]));
  const vouches = [...seed.vouches];
  const audit = [...seed.audit];
  const analytics = [...seed.analytics];

  return {
    // people ----------------------------------------------------------------
    listPeople: async () => [...people.values()],
    getPerson: async (id) => people.get(id) ?? null,
    getPersonByHandle: async (handle) =>
      [...people.values()].find((person) => person.handle === handle) ?? null,
    putPerson: async (person) => {
      people.set(person.id, person);
      return person;
    },

    // trust evidence --------------------------------------------------------
    evidenceFor: async (userId): Promise<EvidenceBundle> => ({
      attestations: attestations.filter((entry) => entry.subjectId === userId),
      attachments: attachments.filter((entry) => entry.userId === userId),
      vouches: vouches.filter((entry) => entry.subjectId === userId),
    }),
    putAttestation: async (attestation) => {
      attestations.push(attestation);
    },

    // geography -------------------------------------------------------------
    listGeoScopes: async () => [...scopes.values()],
    getGeoScope: async (id) => {
      const existing = scopes.get(id);
      if (existing !== undefined) return existing;
      const resolved = getScope(id);
      if (resolved === undefined) return null;
      scopes.set(resolved.id, resolved);
      return resolved;
    },
    listAttachments: async (userId) => attachments.filter((entry) => entry.userId === userId),
    putAttachment: async (attachment) => {
      attachments = [
        ...attachments.filter(
          (entry) => !(entry.userId === attachment.userId && entry.geoScopeId === attachment.geoScopeId),
        ),
        attachment,
      ];
    },
    deleteAttachment: async (userId, geoScopeId) => {
      attachments = attachments.filter(
        (entry) => !(entry.userId === userId && entry.geoScopeId === geoScopeId),
      );
    },

    // content ---------------------------------------------------------------
    listPosts: async (filter) => {
      const all = [...posts.values()];
      if (filter?.geoScopeIds === undefined) return all;
      const wanted = new Set(filter.geoScopeIds);
      return all.filter((post) => wanted.has(post.geoScopeId));
    },
    getPost: async (id) => posts.get(id) ?? null,
    putPost: async (post) => {
      posts.set(post.id, post);
      return post;
    },
    listAppreciations: async (postId) =>
      postId === undefined ? appreciations : appreciations.filter((entry) => entry.postId === postId),
    putAppreciation: async (appreciation) => {
      appreciations.push(appreciation);
    },
    deleteAppreciation: async (postId, actorId) => {
      appreciations = appreciations.filter(
        (entry) => !(entry.postId === postId && entry.actorId === actorId),
      );
    },

    // signals ---------------------------------------------------------------
    listSignals: async (filter) => {
      const all = [...signals.values()];
      if (filter?.geoScopeIds === undefined) return all;
      const wanted = new Set(filter.geoScopeIds);
      return all.filter((signal) => wanted.has(signal.geoScopeId));
    },
    getSignal: async (id) => signals.get(id) ?? null,
    putSignal: async (signal) => {
      signals.set(signal.id, signal);
      return signal;
    },
    listResponses: async (filter) => {
      const all = [...responses.values()];
      return filter?.signalId === undefined
        ? all
        : all.filter((response) => response.signalId === filter.signalId);
    },
    getResponse: async (id) => responses.get(id) ?? null,
    putResponse: async (response) => {
      responses.set(response.id, response);
    },
    listParticipants: async (signalId) =>
      signalId === undefined ? participants : participants.filter((entry) => entry.signalId === signalId),
    putParticipant: async (participant) => {
      participants = [
        ...participants.filter(
          (entry) => !(entry.signalId === participant.signalId && entry.userId === participant.userId),
        ),
        participant,
      ];
    },
    listHostExclusions: async () => exclusions,
    putHostExclusion: async (exclusion) => {
      exclusions.push(exclusion);
    },

    // scoped interaction ----------------------------------------------------
    listThreads: async (userId) => {
      const all = [...threads.values()];
      return userId === undefined ? all : all.filter((thread) => thread.participantIds.includes(userId));
    },
    getThread: async (id) => threads.get(id) ?? null,
    putThread: async (thread) => {
      threads.set(thread.id, thread);
    },
    listMessages: async (threadId) =>
      messages
        .filter((message) => message.threadId === threadId)
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1)),
    putMessage: async (message) => {
      messages.push(message);
    },

    // safety ----------------------------------------------------------------
    listBlocks: async () => blocks,
    putBlock: async (block) => {
      const exists = blocks.some(
        (entry) => entry.blockerId === block.blockerId && entry.blockedId === block.blockedId,
      );
      if (!exists) blocks.push(block);
    },
    deleteBlock: async (blockerId, blockedId) => {
      blocks = blocks.filter(
        (entry) => !(entry.blockerId === blockerId && entry.blockedId === blockedId),
      );
    },
    listReports: async () => reports,
    putReport: async (report) => {
      reports.push(report);
    },
    listModerationCases: async () => [...cases.values()],
    putModerationCase: async (moderationCase) => {
      cases.set(moderationCase.id, moderationCase);
    },
    putModerationAction: async (action) => {
      actions.push(action);
    },

    // community -------------------------------------------------------------
    listInvites: async () => [...invites.values()],
    putInvite: async (invite) => {
      invites.set(invite.id, invite);
    },
    listVouches: async (subjectId) =>
      subjectId === undefined ? vouches : vouches.filter((entry) => entry.subjectId === subjectId),
    putVouch: async (vouch) => {
      vouches.push(vouch);
    },

    // observability ---------------------------------------------------------
    appendAudit: async (event) => {
      audit.push(event);
    },
    listAudit: async () => audit,
    appendAnalytics: async (event) => {
      analytics.push(event);
    },
    listAnalytics: async () => analytics,
  };
}
