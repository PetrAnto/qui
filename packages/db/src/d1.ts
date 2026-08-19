import { and, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';

import type {
  AnalyticsEvent,
  Attestation,
  AuditEvent,
  CommunityInvite,
  EvidenceBundle,
  GeoAttachment,
  GeoScope,
  GeoScopeId,
  ModerationCase,
  Participant,
  Person,
  Post,
  Report,
  Repository,
  Signal,
  SignalResponse,
  Thread,
} from '@indenoi/core';
import { getScope } from '@indenoi/geo';

import * as s from './schema';
import type { SeedData } from './memory';

/**
 * D1/Drizzle implementation of the domain `Repository` (ADR-0011).
 *
 * Behavioural contract with the in-memory store, made explicit so a divergence
 * is a deliberate review decision rather than an accident:
 *
 *  - **Ordering.** List methods order by SQLite `rowid`, which is insertion
 *    order — the same guarantee the in-memory Maps/arrays provide. The one
 *    exception is `listMessages`, which both stores sort by (createdAt, id).
 *  - **Places materialise lazily.** `getGeoScope` resolves a world-dump city
 *    through `@indenoi/geo` on first touch and persists the row, exactly like
 *    the in-memory store caches it. Writes that reference a scope
 *    (`putPost`, `putSignal`, `putAttachment`, `putVouch`, `putInvite`) ensure
 *    the row first, because D1 enforces the foreign keys the in-memory store
 *    does not have. Place rows are public reference data, so materialising one
 *    is never a write about a person.
 *  - **Derived collections stay derived.** `ModerationCase.reportIds` comes
 *    from the reports table, `Thread.participantIds` from thread_participants,
 *    and a person's four facet lists from profile_tags — one source of truth
 *    per fact.
 *  - **Write semantics.** `put*` upserts where the in-memory Map would replace;
 *    append-only collections stay append-only. `putBlock` is idempotent on its
 *    natural key, matching the in-memory dedup. `putHostExclusion` is
 *    idempotent on its (signal, user) primary key where the in-memory store
 *    would append a duplicate — invisible downstream, because policy consumes
 *    exclusions with `.some(...)`. `putAppreciation` deliberately does *not*
 *    dedup beyond the unique index: a double-appreciation is a service bug and
 *    should fail loudly, not score silently differently between stores.
 */

/** SQLite rowid == insertion order, matching the in-memory store's Maps. */
const INSERTION = sql`rowid`;

/**
 * Cloudflare D1 binds at most 100 parameters per individual query — and the
 * ceiling applies to each statement inside a `batch()`, so batching is not a
 * bypass. Multi-row INSERTs are chunked so every generated statement stays
 * under it. The row cap is derived from the row's own width (an 11-binding
 * geo_scopes row chunks at 9, not 10), so adding a column narrows the chunk
 * automatically instead of silently breaking the limit.
 */
const D1_MAX_BOUND_PARAMETERS = 100;

function chunkRows<Row extends Record<string, unknown>>(rows: readonly Row[]): readonly Row[][] {
  if (rows.length === 0) return [];
  // Mappers in this file produce uniform shapes, so the first row's width is
  // every row's width.
  const bindingsPerRow = Object.keys(rows[0] as Record<string, unknown>).length;
  const maxRows = Math.floor(D1_MAX_BOUND_PARAMETERS / bindingsPerRow);
  if (maxRows < 1) {
    throw new Error(`row width ${bindingsPerRow} exceeds the D1 bound-parameter limit`);
  }
  const chunks: Row[][] = [];
  for (let index = 0; index < rows.length; index += maxRows) {
    chunks.push(rows.slice(index, index + maxRows));
  }
  return chunks;
}

// -- row <-> domain mappers ---------------------------------------------------
// Storage columns are strings; the domain unions are narrower. The cast lives
// at this boundary and nowhere else, so a shape regression is a typecheck
// error here rather than a runtime surprise downstream.

function scopeFromRow(row: typeof s.geoScopes.$inferSelect): GeoScope {
  return {
    id: row.id,
    kind: row.kind as GeoScope['kind'],
    name: row.name,
    parentId: row.parentId,
    countryCode: row.countryCode,
    timezone: row.timezone,
    centroid:
      row.centroidLat === null || row.centroidLng === null
        ? null
        : { lat: row.centroidLat, lng: row.centroidLng },
    provenance: {
      source: row.provenanceSource as GeoScope['provenance']['source'],
      sourceId: row.provenanceSourceId,
      verified: row.provenanceVerified,
    },
  };
}

function scopeRow(scope: GeoScope): typeof s.geoScopes.$inferInsert {
  return {
    id: scope.id,
    kind: scope.kind,
    name: scope.name,
    parentId: scope.parentId,
    countryCode: scope.countryCode,
    timezone: scope.timezone,
    centroidLat: scope.centroid?.lat ?? null,
    centroidLng: scope.centroid?.lng ?? null,
    provenanceSource: scope.provenance.source,
    provenanceSourceId: scope.provenance.sourceId,
    provenanceVerified: scope.provenance.verified,
  };
}

function personFromRow(
  row: typeof s.people.$inferSelect,
  tags: readonly (typeof s.profileTags.$inferSelect)[],
): Person {
  const facet = (kind: string): readonly string[] =>
    tags.filter((tag) => tag.kind === kind).map((tag) => tag.value);
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.displayName,
    avatar: {
      id: row.avatarId,
      kind: 'image',
      alt: row.avatarAlt,
      seed: row.avatarSeed,
      motif: row.avatarMotif,
      metadataStripped: row.avatarMetadataStripped,
    },
    bio: row.bio,
    ageBand: row.ageBand as Person['ageBand'],
    accountState: row.accountState as Person['accountState'],
    role: row.role as Person['role'],
    practices: facet('practice'),
    interests: facet('interest'),
    canHelpWith: facet('can_help_with'),
    wantsToLearn: facet('wants_to_learn'),
    createdAt: row.createdAt,
    demo: true,
  };
}

function personRow(person: Person): typeof s.people.$inferInsert {
  return {
    id: person.id,
    handle: person.handle,
    displayName: person.displayName,
    bio: person.bio,
    avatarId: person.avatar.id,
    avatarSeed: person.avatar.seed,
    avatarMotif: person.avatar.motif,
    avatarAlt: person.avatar.alt,
    avatarMetadataStripped: person.avatar.metadataStripped,
    ageBand: person.ageBand,
    accountState: person.accountState,
    role: person.role,
    isDemo: person.demo,
    createdAt: person.createdAt,
  };
}

const FACET_KINDS = [
  ['practices', 'practice'],
  ['interests', 'interest'],
  ['canHelpWith', 'can_help_with'],
  ['wantsToLearn', 'wants_to_learn'],
] as const;

function attestationFromRow(row: typeof s.attestations.$inferSelect): Attestation {
  return {
    id: row.id,
    subjectId: row.subjectId,
    kind: row.kind as Attestation['kind'],
    geoScopeId: row.geoScopeId,
    result: row.result as Attestation['result'],
    method: row.method as Attestation['method'],
    providerRef: row.providerRef,
    ageThreshold: row.ageThreshold as Attestation['ageThreshold'],
    country: row.country,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
  };
}

function attestationRow(a: Attestation): typeof s.attestations.$inferInsert {
  return {
    id: a.id,
    subjectId: a.subjectId,
    kind: a.kind,
    geoScopeId: a.geoScopeId,
    result: a.result,
    method: a.method,
    providerRef: a.providerRef,
    ageThreshold: a.ageThreshold,
    country: a.country,
    issuedAt: a.issuedAt,
    expiresAt: a.expiresAt,
  };
}

function attachmentFromRow(row: typeof s.geoAttachments.$inferSelect): GeoAttachment {
  return {
    userId: row.userId,
    geoScopeId: row.geoScopeId,
    kind: row.kind as GeoAttachment['kind'],
    evidence: row.evidence as GeoAttachment['evidence'],
    since: row.since,
  };
}

function postFromRow(row: typeof s.posts.$inferSelect): Post {
  return {
    id: row.id,
    authorId: row.authorId,
    geoScopeId: row.geoScopeId,
    caption: row.caption,
    practice: row.practice,
    media: {
      id: row.mediaId,
      kind: 'image',
      alt: row.mediaAlt,
      seed: row.mediaSeed,
      motif: row.mediaMotif,
      metadataStripped: row.mediaMetadataStripped,
    },
    audience: row.audience as Post['audience'],
    state: row.state as Post['state'],
    createdAt: row.createdAt,
    demo: true,
  };
}

function postRow(post: Post): typeof s.posts.$inferInsert {
  return {
    id: post.id,
    authorId: post.authorId,
    geoScopeId: post.geoScopeId,
    caption: post.caption,
    practice: post.practice,
    mediaId: post.media.id,
    mediaAlt: post.media.alt,
    mediaSeed: post.media.seed,
    mediaMotif: post.media.motif,
    mediaMetadataStripped: post.media.metadataStripped,
    audience: post.audience,
    state: post.state,
    isDemo: post.demo,
    createdAt: post.createdAt,
  };
}

function signalFromRow(row: typeof s.signals.$inferSelect): Signal {
  return {
    id: row.id,
    creatorId: row.creatorId,
    type: row.type as Signal['type'],
    title: row.title,
    body: row.body,
    geoScopeId: row.geoScopeId,
    practice: row.practice,
    linkedPostId: row.linkedPostId,
    placeLabel: row.placeLabel,
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    capacity: row.capacity,
    audience: row.audience as Signal['audience'],
    state: row.state as Signal['state'],
    createdAt: row.createdAt,
    demo: true,
  };
}

function signalRow(signal: Signal): typeof s.signals.$inferInsert {
  return {
    id: signal.id,
    creatorId: signal.creatorId,
    type: signal.type,
    title: signal.title,
    body: signal.body,
    geoScopeId: signal.geoScopeId,
    practice: signal.practice,
    linkedPostId: signal.linkedPostId,
    placeLabel: signal.placeLabel,
    startsAt: signal.startsAt,
    expiresAt: signal.expiresAt,
    capacity: signal.capacity,
    audience: signal.audience,
    state: signal.state,
    isDemo: signal.demo,
    createdAt: signal.createdAt,
  };
}

function responseFromRow(row: typeof s.signalResponses.$inferSelect): SignalResponse {
  return {
    id: row.id,
    signalId: row.signalId,
    responderId: row.responderId,
    message: row.message,
    state: row.state as SignalResponse['state'],
    createdAt: row.createdAt,
  };
}

function caseFromRow(
  row: typeof s.moderationCases.$inferSelect,
  reportIds: readonly string[],
): ModerationCase {
  return {
    id: row.id,
    targetType: row.targetType as ModerationCase['targetType'],
    targetId: row.targetId,
    state: row.state as ModerationCase['state'],
    reportIds,
    triageLabels: row.triageLabels === '' ? [] : row.triageLabels.split(','),
    createdAt: row.createdAt,
  };
}

function auditFromRow(row: typeof s.auditEvents.$inferSelect): AuditEvent {
  return {
    id: row.id,
    at: row.at,
    actorId: row.actorId,
    action: row.action,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    metadata: JSON.parse(row.metadata) as AuditEvent['metadata'],
  };
}

function analyticsFromRow(row: typeof s.analyticsEvents.$inferSelect): AnalyticsEvent {
  return {
    id: row.id,
    name: row.name as AnalyticsEvent['name'],
    at: row.at,
    actorId: row.actorId,
    geoScopeId: row.geoScopeId,
    practice: row.practice,
    signalType: row.signalType as AnalyticsEvent['signalType'],
    targetId: row.targetId,
  };
}

export function createD1Repository(database: D1Database): Repository {
  const db = drizzle(database);

  /** Resolve a scope row, materialising world-dump cities on first touch. */
  async function ensureScope(id: GeoScopeId): Promise<void> {
    const existing = await db
      .select({ id: s.geoScopes.id })
      .from(s.geoScopes)
      .where(eq(s.geoScopes.id, id))
      .limit(1);
    if (existing.length > 0) return;
    const resolved = getScope(id);
    if (resolved === undefined) {
      // The in-memory store would silently store a dangling reference; D1's
      // foreign keys would throw a raw constraint error. Fail with meaning.
      throw new Error(`reference to unknown geo scope: ${id}`);
    }
    await db.insert(s.geoScopes).values(scopeRow(resolved)).onConflictDoNothing();
  }

  async function tagsFor(
    userIds: readonly string[],
  ): Promise<Map<string, (typeof s.profileTags.$inferSelect)[]>> {
    const byUser = new Map<string, (typeof s.profileTags.$inferSelect)[]>();
    if (userIds.length === 0) return byUser;
    const rows = await db
      .select()
      .from(s.profileTags)
      .where(inArray(s.profileTags.userId, [...userIds]))
      // Insertion order, not the composite PK's alphabetical order: a person's
      // facet lists are ordered data ("freediving" first means something).
      .orderBy(INSERTION);
    for (const row of rows) {
      const list = byUser.get(row.userId) ?? [];
      list.push(row);
      byUser.set(row.userId, list);
    }
    return byUser;
  }

  return {
    // people ----------------------------------------------------------------
    listPeople: async () => {
      const rows = await db.select().from(s.people).orderBy(INSERTION);
      const tags = await tagsFor(rows.map((row) => row.id));
      return rows.map((row) => personFromRow(row, tags.get(row.id) ?? []));
    },
    getPerson: async (id) => {
      const rows = await db.select().from(s.people).where(eq(s.people.id, id)).limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      const tags = await tagsFor([id]);
      return personFromRow(row, tags.get(id) ?? []);
    },
    getPersonByHandle: async (handle) => {
      const rows = await db.select().from(s.people).where(eq(s.people.handle, handle)).limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      const tags = await tagsFor([row.id]);
      return personFromRow(row, tags.get(row.id) ?? []);
    },
    putPerson: async (person) => {
      const row = personRow(person);
      const tagRows = FACET_KINDS.flatMap(([facet, kind]) =>
        person[facet].map((value) => ({ userId: person.id, kind, value })),
      );
      // One atomic batch: the row upsert, the wholesale facet replacement
      // (delete + chunked inserts), all or nothing. The in-memory store is
      // single-tick here; without batch, D1 would let a reader observe a
      // person with their facets momentarily deleted.
      const statements = [
        db.insert(s.people).values(row).onConflictDoUpdate({ target: s.people.id, set: row }),
        db.delete(s.profileTags).where(eq(s.profileTags.userId, person.id)),
        ...chunkRows(tagRows).map((chunk) => db.insert(s.profileTags).values(chunk)),
      ];
      await db.batch(statements as [(typeof statements)[0], ...(typeof statements)[0][]]);
      return person;
    },

    // trust evidence ----------------------------------------------------------
    evidenceFor: async (userId): Promise<EvidenceBundle> => {
      const [attestationRows, attachmentRows, vouchRows] = await Promise.all([
        db.select().from(s.attestations).where(eq(s.attestations.subjectId, userId)).orderBy(INSERTION),
        db.select().from(s.geoAttachments).where(eq(s.geoAttachments.userId, userId)).orderBy(INSERTION),
        db.select().from(s.vouchEvidence).where(eq(s.vouchEvidence.subjectId, userId)).orderBy(INSERTION),
      ]);
      return {
        attestations: attestationRows.map(attestationFromRow),
        attachments: attachmentRows.map(attachmentFromRow),
        vouches: vouchRows.map((row) => ({
          id: row.id,
          voucherId: row.voucherId,
          subjectId: row.subjectId,
          geoScopeId: row.geoScopeId,
          statement: row.statement,
          createdAt: row.createdAt,
        })),
      };
    },
    putAttestation: async (attestation) => {
      await db.insert(s.attestations).values(attestationRow(attestation));
    },



    // geography -------------------------------------------------------------
    listGeoScopes: async () => {
      const rows = await db.select().from(s.geoScopes).orderBy(INSERTION);
      return rows.map(scopeFromRow);
    },
    getGeoScope: async (id) => {
      const rows = await db.select().from(s.geoScopes).where(eq(s.geoScopes.id, id)).limit(1);
      const row = rows[0];
      if (row !== undefined) return scopeFromRow(row);
      const resolved = getScope(id);
      if (resolved === undefined) return null;
      await db.insert(s.geoScopes).values(scopeRow(resolved)).onConflictDoNothing();
      return resolved;
    },
    listAttachments: async (userId) => {
      const rows = await db
        .select()
        .from(s.geoAttachments)
        .where(eq(s.geoAttachments.userId, userId))
        .orderBy(INSERTION);
      return rows.map(attachmentFromRow);
    },
    putAttachment: async (attachment) => {
      await ensureScope(attachment.geoScopeId);
      // Delete-then-insert in one batch: the in-memory store moves a re-put
      // attachment to the end (filter + push), and listAttachments order is
      // per-user visible. A fresh rowid reproduces that exactly, atomically.
      await db.batch([
        db
          .delete(s.geoAttachments)
          .where(
            and(
              eq(s.geoAttachments.userId, attachment.userId),
              eq(s.geoAttachments.geoScopeId, attachment.geoScopeId),
            ),
          ),
        db.insert(s.geoAttachments).values(attachment),
      ]);
    },
    deleteAttachment: async (userId, geoScopeId) => {
      await db
        .delete(s.geoAttachments)
        .where(and(eq(s.geoAttachments.userId, userId), eq(s.geoAttachments.geoScopeId, geoScopeId)));
    },

    // content ---------------------------------------------------------------
    listPosts: async (filter) => {
      if (filter?.geoScopeIds !== undefined && filter.geoScopeIds.length === 0) return [];
      const base = db.select().from(s.posts).orderBy(INSERTION);
      const rows =
        filter?.geoScopeIds === undefined
          ? await base
          : await base.where(inArray(s.posts.geoScopeId, [...filter.geoScopeIds]));
      return rows.map(postFromRow);
    },
    getPost: async (id) => {
      const rows = await db.select().from(s.posts).where(eq(s.posts.id, id)).limit(1);
      return rows[0] === undefined ? null : postFromRow(rows[0]);
    },
    putPost: async (post) => {
      await ensureScope(post.geoScopeId);
      const row = postRow(post);
      await db.insert(s.posts).values(row).onConflictDoUpdate({ target: s.posts.id, set: row });
      return post;
    },
    listAppreciations: async (postId) => {
      const base = db.select().from(s.appreciations).orderBy(INSERTION);
      const rows =
        postId === undefined ? await base : await base.where(eq(s.appreciations.postId, postId));
      return rows.map((row) => ({
        id: row.id,
        postId: row.postId,
        actorId: row.actorId,
        createdAt: row.createdAt,
      }));
    },
    putAppreciation: async (appreciation) => {
      await db.insert(s.appreciations).values(appreciation);
    },
    deleteAppreciation: async (postId, actorId) => {
      await db
        .delete(s.appreciations)
        .where(and(eq(s.appreciations.postId, postId), eq(s.appreciations.actorId, actorId)));
    },

    // signals -----------------------------------------------------------------
    listSignals: async (filter) => {
      if (filter?.geoScopeIds !== undefined && filter.geoScopeIds.length === 0) return [];
      const base = db.select().from(s.signals).orderBy(INSERTION);
      const rows =
        filter?.geoScopeIds === undefined
          ? await base
          : await base.where(inArray(s.signals.geoScopeId, [...filter.geoScopeIds]));
      return rows.map(signalFromRow);
    },
    getSignal: async (id) => {
      const rows = await db.select().from(s.signals).where(eq(s.signals.id, id)).limit(1);
      return rows[0] === undefined ? null : signalFromRow(rows[0]);
    },
    putSignal: async (signal) => {
      await ensureScope(signal.geoScopeId);
      const row = signalRow(signal);
      await db.insert(s.signals).values(row).onConflictDoUpdate({ target: s.signals.id, set: row });
      return signal;
    },
    listResponses: async (filter) => {
      const base = db.select().from(s.signalResponses).orderBy(INSERTION);
      const rows =
        filter?.signalId === undefined
          ? await base
          : await base.where(eq(s.signalResponses.signalId, filter.signalId));
      return rows.map(responseFromRow);
    },
    getResponse: async (id) => {
      const rows = await db.select().from(s.signalResponses).where(eq(s.signalResponses.id, id)).limit(1);
      return rows[0] === undefined ? null : responseFromRow(rows[0]);
    },
    putResponse: async (response) => {
      await db.insert(s.signalResponses).values(response).onConflictDoUpdate({
        target: s.signalResponses.id,
        set: {
          message: response.message,
          state: response.state,
          createdAt: response.createdAt,
        },
      });
    },
    listParticipants: async (signalId) => {
      const base = db.select().from(s.participants).orderBy(INSERTION);
      const rows =
        signalId === undefined
          ? await base
          : await base.where(eq(s.participants.signalId, signalId));
      return rows.map((row) => ({
        signalId: row.signalId,
        userId: row.userId,
        state: row.state as Participant['state'],
        joinedAt: row.joinedAt,
      }));
    },
    putParticipant: async (participant) => {
      // Delete-then-insert in one batch: the in-memory store moves a re-put
      // participant to the end (filter + push). A fresh rowid matches.
      await db.batch([
        db
          .delete(s.participants)
          .where(
            and(
              eq(s.participants.signalId, participant.signalId),
              eq(s.participants.userId, participant.userId),
            ),
          ),
        db.insert(s.participants).values(participant),
      ]);
    },
    listHostExclusions: async () => {
      const rows = await db.select().from(s.hostExclusions).orderBy(INSERTION);
      return rows.map((row) => ({
        signalId: row.signalId,
        userId: row.userId,
        byHostId: row.byHostId,
        reason: row.reason,
        at: row.at,
      }));
    },
    putHostExclusion: async (exclusion) => {
      // The schema's primary key is (signal, user): excluding the same person
      // from the same object twice is a no-op here, where the in-memory store
      // would append a duplicate row. The difference is invisible downstream —
      // policy consumes exclusions with `.some(...)`.
      await db.insert(s.hostExclusions).values(exclusion).onConflictDoNothing();
    },


    // scoped interaction ------------------------------------------------------
    listThreads: async (userId) => {
      const threadRows = await db.select().from(s.threads).orderBy(INSERTION);
      const membership = await db.select().from(s.threadParticipants).orderBy(INSERTION);
      const byThread = new Map<string, string[]>();
      for (const row of membership) {
        const list = byThread.get(row.threadId) ?? [];
        list.push(row.userId);
        byThread.set(row.threadId, list);
      }
      return threadRows
        .map((row) => ({
          id: row.id,
          signalId: row.signalId,
          responseId: row.responseId,
          participantIds: byThread.get(row.id) ?? [],
          state: row.state as Thread['state'],
          createdAt: row.createdAt,
        }))
        .filter((thread) => userId === undefined || thread.participantIds.includes(userId));
    },
    getThread: async (id) => {
      const rows = await db.select().from(s.threads).where(eq(s.threads.id, id)).limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      const membership = await db
        .select()
        .from(s.threadParticipants)
        .where(eq(s.threadParticipants.threadId, id))
        .orderBy(INSERTION);
      return {
        id: row.id,
        signalId: row.signalId,
        responseId: row.responseId,
        participantIds: membership.map((entry) => entry.userId),
        state: row.state as Thread['state'],
        createdAt: row.createdAt,
      };
    },
    putThread: async (thread) => {
      const row = {
        id: thread.id,
        signalId: thread.signalId,
        responseId: thread.responseId,
        state: thread.state,
        createdAt: thread.createdAt,
      };
      const membershipRows = thread.participantIds.map((userId) => ({
        threadId: thread.id,
        userId,
      }));
      // Upsert + membership replacement in one atomic batch — a reader must
      // never see a thread with its participant list momentarily empty.
      const statements = [
        db.insert(s.threads).values(row).onConflictDoUpdate({ target: s.threads.id, set: row }),
        db.delete(s.threadParticipants).where(eq(s.threadParticipants.threadId, thread.id)),
        ...chunkRows(membershipRows).map((chunk) => db.insert(s.threadParticipants).values(chunk)),
      ];
      await db.batch(statements as [(typeof statements)[0], ...(typeof statements)[0][]]);
    },
    listMessages: async (threadId) => {
      const rows = await db
        .select()
        .from(s.messages)
        .where(eq(s.messages.threadId, threadId))
        .orderBy(s.messages.createdAt, s.messages.id);
      return rows.map((row) => ({
        id: row.id,
        threadId: row.threadId,
        authorId: row.authorId,
        body: row.body,
        createdAt: row.createdAt,
      }));
    },
    putMessage: async (message) => {
      await db.insert(s.messages).values(message);
    },


    // safety ------------------------------------------------------------------
    listBlocks: async () => {
      const rows = await db.select().from(s.blocks).orderBy(INSERTION);
      return rows.map((row) => ({
        id: row.id,
        blockerId: row.blockerId,
        blockedId: row.blockedId,
        createdAt: row.createdAt,
      }));
    },
    putBlock: async (block) => {
      await db
        .insert(s.blocks)
        .values(block)
        .onConflictDoNothing({ target: [s.blocks.blockerId, s.blocks.blockedId] });
    },
    deleteBlock: async (blockerId, blockedId) => {
      await db
        .delete(s.blocks)
        .where(and(eq(s.blocks.blockerId, blockerId), eq(s.blocks.blockedId, blockedId)));
    },
    listReports: async () => {
      const rows = await db.select().from(s.reports).orderBy(INSERTION);
      return rows.map((row) => ({
        id: row.id,
        reporterId: row.reporterId,
        targetType: row.targetType as Report['targetType'],
        targetId: row.targetId,
        reason: row.reason as Report['reason'],
        note: row.note,
        caseId: row.caseId,
        createdAt: row.createdAt,
      }));
    },
    putReport: async (report) => {
      await db.insert(s.reports).values(report);
    },
    listModerationCases: async () => {
      const caseRows = await db.select().from(s.moderationCases).orderBy(INSERTION);
      const reportRows = await db
        .select({ id: s.reports.id, caseId: s.reports.caseId })
        .from(s.reports)
        .orderBy(INSERTION);
      return caseRows.map((row) =>
        caseFromRow(
          row,
          reportRows.filter((report) => report.caseId === row.id).map((report) => report.id),
        ),
      );
    },
    putModerationCase: async (moderationCase) => {
      // reportIds is derived from the reports table on read; the case row owns
      // state and triage labels only.
      const row = {
        id: moderationCase.id,
        targetType: moderationCase.targetType,
        targetId: moderationCase.targetId,
        state: moderationCase.state,
        triageLabels: moderationCase.triageLabels.join(','),
        createdAt: moderationCase.createdAt,
      };
      await db
        .insert(s.moderationCases)
        .values(row)
        .onConflictDoUpdate({ target: s.moderationCases.id, set: row });
    },
    putModerationAction: async (action) => {
      await db.insert(s.moderationActions).values({
        id: action.id,
        caseId: action.caseId,
        kind: action.kind,
        actorId: action.actorId,
        rationale: action.rationale,
        expiresAt: action.expiresAt,
        at: action.at,
      });
    },


    // community ---------------------------------------------------------------
    listInvites: async () => {
      const rows = await db.select().from(s.communityInvites).orderBy(INSERTION);
      return rows.map((row) => ({
        id: row.id,
        code: row.code,
        inviterId: row.inviterId,
        geoScopeId: row.geoScopeId,
        state: row.state as CommunityInvite['state'],
        acceptedById: row.acceptedById,
        createdAt: row.createdAt,
      }));
    },
    putInvite: async (invite) => {
      await ensureScope(invite.geoScopeId);
      await db.insert(s.communityInvites).values(invite).onConflictDoUpdate({
        target: s.communityInvites.id,
        set: { state: invite.state, acceptedById: invite.acceptedById },
      });
    },
    listVouches: async (subjectId) => {
      const base = db.select().from(s.vouchEvidence).orderBy(INSERTION);
      const rows =
        subjectId === undefined
          ? await base
          : await base.where(eq(s.vouchEvidence.subjectId, subjectId));
      return rows.map((row) => ({
        id: row.id,
        voucherId: row.voucherId,
        subjectId: row.subjectId,
        geoScopeId: row.geoScopeId,
        statement: row.statement,
        createdAt: row.createdAt,
      }));
    },
    putVouch: async (vouch) => {
      await ensureScope(vouch.geoScopeId);
      // One vouch per (voucher, subject, scope); a re-vouch is a restatement.
      await db.insert(s.vouchEvidence).values(vouch).onConflictDoUpdate({
        target: [s.vouchEvidence.voucherId, s.vouchEvidence.subjectId, s.vouchEvidence.geoScopeId],
        set: { statement: vouch.statement, createdAt: vouch.createdAt },
      });
    },

    // observability -----------------------------------------------------------
    appendAudit: async (event) => {
      await db.insert(s.auditEvents).values({
        id: event.id,
        at: event.at,
        actorId: event.actorId,
        action: event.action,
        subjectType: event.subjectType,
        subjectId: event.subjectId,
        metadata: JSON.stringify(event.metadata),
      });
    },
    listAudit: async () => {
      const rows = await db.select().from(s.auditEvents).orderBy(INSERTION);
      return rows.map(auditFromRow);
    },
    appendAnalytics: async (event) => {
      await db.insert(s.analyticsEvents).values(event);
    },
    listAnalytics: async () => {
      const rows = await db.select().from(s.analyticsEvents).orderBy(INSERTION);
      return rows.map(analyticsFromRow);
    },
  };
}

/**
 * Load a `SeedData` dataset into D1 in dependency order. Used by the parity
 * tests today; the enablement path (ADR-0011) will decide whether a demo seed
 * belongs in a provisioned database at all.
 */
export async function seedD1Database(database: D1Database, seed: SeedData): Promise<void> {
  const db = drizzle(database);
  if (seed.scopes.length > 0) {
    const scopeRows = seed.scopes.map(scopeRow);
    for (const chunk of chunkRows(scopeRows)) {
      await db.insert(s.geoScopes).values(chunk).onConflictDoNothing();
    }
  }
  const repo = createD1Repository(database);
  for (const person of seed.people) await repo.putPerson(person);
  for (const attestation of seed.attestations) await repo.putAttestation(attestation);
  for (const attachment of seed.attachments) await repo.putAttachment(attachment);
  for (const post of seed.posts) await repo.putPost(post);
  for (const appreciation of seed.appreciations) await repo.putAppreciation(appreciation);
  for (const signal of seed.signals) await repo.putSignal(signal);
  for (const response of seed.responses) await repo.putResponse(response);
  for (const participant of seed.participants) await repo.putParticipant(participant);
  for (const exclusion of seed.exclusions) await repo.putHostExclusion(exclusion);
  for (const thread of seed.threads) await repo.putThread(thread);
  for (const message of seed.messages) await repo.putMessage(message);
  for (const block of seed.blocks) await repo.putBlock(block);
  for (const report of seed.reports) await repo.putReport(report);
  for (const moderationCase of seed.cases) await repo.putModerationCase(moderationCase);
  for (const action of seed.actions) await repo.putModerationAction(action);
  for (const invite of seed.invites) await repo.putInvite(invite);
  for (const vouch of seed.vouches) await repo.putVouch(vouch);
  for (const event of seed.audit) await repo.appendAudit(event);
  for (const event of seed.analytics) await repo.appendAnalytics(event);
}

