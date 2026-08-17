import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * D1 (SQLite) schema.
 *
 * Two absences are load-bearing and asserted by tests:
 *  - no latitude/longitude/geohash column on any person-scoped table
 *    (INV-GEO-1). Places carry coordinates; people carry a scope id;
 *  - no column able to hold a document, a birth date or a third-party
 *    credential (INV-KYC-1, INV-SOCIAL-1). Age is a band, identity is a
 *    provider reference plus a boolean.
 *
 * Ids are opaque strings so a future partitioning scheme (by scope, by region)
 * can change how they are allocated without a data migration.
 */

export const people = sqliteTable(
  'people',
  {
    id: text('id').primaryKey(),
    handle: text('handle').notNull(),
    displayName: text('display_name').notNull(),
    bio: text('bio').notNull().default(''),
    avatarSeed: text('avatar_seed').notNull(),
    avatarMotif: text('avatar_motif').notNull(),
    /** 'minor_15_17' | 'adult_18_plus'. Never a date. */
    ageBand: text('age_band').notNull(),
    accountState: text('account_state').notNull().default('active'),
    role: text('role').notNull().default('member'),
    isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('people_handle_idx').on(table.handle)],
);

export const profileTags = sqliteTable(
  'profile_tags',
  {
    userId: text('user_id')
      .notNull()
      .references(() => people.id),
    /** 'practice' | 'interest' | 'can_help_with' | 'wants_to_learn' */
    kind: text('kind').notNull(),
    value: text('value').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.kind, table.value] }),
    index('profile_tags_value_idx').on(table.value),
  ],
);

export const attestations = sqliteTable(
  'attestations',
  {
    id: text('id').primaryKey(),
    subjectId: text('subject_id')
      .notNull()
      .references(() => people.id),
    kind: text('kind').notNull(),
    geoScopeId: text('geo_scope_id'),
    result: text('result').notNull(),
    method: text('method').notNull(),
    /** Opaque provider reference. Never a document identifier. */
    providerRef: text('provider_ref'),
    ageThreshold: integer('age_threshold'),
    country: text('country'),
    issuedAt: text('issued_at').notNull(),
    expiresAt: text('expires_at'),
  },
  (table) => [index('attestations_subject_idx').on(table.subjectId, table.kind)],
);

export const geoScopes = sqliteTable(
  'geo_scopes',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    parentId: text('parent_id'),
    countryCode: text('country_code').notNull(),
    timezone: text('timezone'),
    // Places may carry a centroid. People may not.
    centroidLat: integer('centroid_lat'),
    centroidLng: integer('centroid_lng'),
    provenanceSource: text('provenance_source').notNull(),
    provenanceSourceId: text('provenance_source_id'),
    provenanceVerified: integer('provenance_verified', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [index('geo_scopes_parent_idx').on(table.parentId), index('geo_scopes_name_idx').on(table.name)],
);

export const geoAttachments = sqliteTable(
  'geo_attachments',
  {
    userId: text('user_id')
      .notNull()
      .references(() => people.id),
    geoScopeId: text('geo_scope_id')
      .notNull()
      .references(() => geoScopes.id),
    kind: text('kind').notNull(),
    evidence: text('evidence').notNull(),
    since: text('since').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.geoScopeId] }),
    index('geo_attachments_scope_idx').on(table.geoScopeId),
  ],
);

export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey(),
    authorId: text('author_id')
      .notNull()
      .references(() => people.id),
    geoScopeId: text('geo_scope_id')
      .notNull()
      .references(() => geoScopes.id),
    caption: text('caption').notNull(),
    practice: text('practice'),
    mediaId: text('media_id').notNull(),
    mediaAlt: text('media_alt').notNull(),
    mediaSeed: text('media_seed').notNull(),
    mediaMotif: text('media_motif').notNull(),
    mediaMetadataStripped: integer('media_metadata_stripped', { mode: 'boolean' })
      .notNull()
      .default(true),
    audience: text('audience').notNull().default('all'),
    state: text('state').notNull().default('published'),
    isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('posts_scope_created_idx').on(table.geoScopeId, table.createdAt),
    index('posts_author_idx').on(table.authorId),
  ],
);

export const appreciations = sqliteTable(
  'appreciations',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id),
    actorId: text('actor_id')
      .notNull()
      .references(() => people.id),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('appreciations_unique_idx').on(table.postId, table.actorId)],
);

export const signals = sqliteTable(
  'signals',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => people.id),
    /** 'ask' | 'offer' | 'join' | 'event'. There is no romantic intent. */
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    geoScopeId: text('geo_scope_id')
      .notNull()
      .references(() => geoScopes.id),
    practice: text('practice'),
    linkedPostId: text('linked_post_id'),
    /** A meeting-point label, never a home address. */
    placeLabel: text('place_label'),
    startsAt: text('starts_at'),
    expiresAt: text('expires_at'),
    capacity: integer('capacity'),
    audience: text('audience').notNull().default('all'),
    state: text('state').notNull().default('open'),
    isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('signals_scope_state_idx').on(table.geoScopeId, table.state),
    index('signals_creator_idx').on(table.creatorId),
  ],
);

export const signalResponses = sqliteTable(
  'signal_responses',
  {
    id: text('id').primaryKey(),
    signalId: text('signal_id')
      .notNull()
      .references(() => signals.id),
    responderId: text('responder_id')
      .notNull()
      .references(() => people.id),
    message: text('message').notNull().default(''),
    state: text('state').notNull().default('pending'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('signal_responses_signal_idx').on(table.signalId)],
);

export const participants = sqliteTable(
  'participants',
  {
    signalId: text('signal_id')
      .notNull()
      .references(() => signals.id),
    userId: text('user_id')
      .notNull()
      .references(() => people.id),
    state: text('state').notNull().default('joined'),
    joinedAt: text('joined_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.signalId, table.userId] })],
);

/** A host decision scoped to one object. Never a platform-wide power. */
export const hostExclusions = sqliteTable(
  'host_exclusions',
  {
    signalId: text('signal_id')
      .notNull()
      .references(() => signals.id),
    userId: text('user_id')
      .notNull()
      .references(() => people.id),
    byHostId: text('by_host_id')
      .notNull()
      .references(() => people.id),
    reason: text('reason').notNull().default(''),
    at: text('at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.signalId, table.userId] })],
);

export const threads = sqliteTable(
  'threads',
  {
    id: text('id').primaryKey(),
    /** A thread cannot exist without the signal and response that created it. */
    signalId: text('signal_id')
      .notNull()
      .references(() => signals.id),
    responseId: text('response_id')
      .notNull()
      .references(() => signalResponses.id),
    state: text('state').notNull().default('open'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('threads_signal_idx').on(table.signalId)],
);

export const threadParticipants = sqliteTable(
  'thread_participants',
  {
    threadId: text('thread_id')
      .notNull()
      .references(() => threads.id),
    userId: text('user_id')
      .notNull()
      .references(() => people.id),
  },
  (table) => [primaryKey({ columns: [table.threadId, table.userId] })],
);

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    threadId: text('thread_id')
      .notNull()
      .references(() => threads.id),
    authorId: text('author_id')
      .notNull()
      .references(() => people.id),
    body: text('body').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('messages_thread_idx').on(table.threadId, table.createdAt)],
);

export const blocks = sqliteTable(
  'blocks',
  {
    id: text('id').primaryKey(),
    blockerId: text('blocker_id')
      .notNull()
      .references(() => people.id),
    blockedId: text('blocked_id')
      .notNull()
      .references(() => people.id),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('blocks_unique_idx').on(table.blockerId, table.blockedId),
    index('blocks_blocked_idx').on(table.blockedId),
  ],
);

export const reports = sqliteTable(
  'reports',
  {
    id: text('id').primaryKey(),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => people.id),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    reason: text('reason').notNull(),
    note: text('note').notNull().default(''),
    caseId: text('case_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('reports_case_idx').on(table.caseId)],
);

export const moderationCases = sqliteTable(
  'moderation_cases',
  {
    id: text('id').primaryKey(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    state: text('state').notNull().default('open'),
    /** Machine triage hints. Never the sole basis for an action. */
    triageLabels: text('triage_labels').notNull().default(''),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('moderation_cases_target_idx').on(table.targetType, table.targetId)],
);

export const moderationActions = sqliteTable(
  'moderation_actions',
  {
    id: text('id').primaryKey(),
    caseId: text('case_id')
      .notNull()
      .references(() => moderationCases.id),
    kind: text('kind').notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => people.id),
    rationale: text('rationale').notNull().default(''),
    /** Restrictions are time-bounded unless a human renews them. */
    expiresAt: text('expires_at'),
    at: text('at').notNull(),
  },
  (table) => [index('moderation_actions_case_idx').on(table.caseId)],
);

export const communityInvites = sqliteTable(
  'community_invites',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => people.id),
    geoScopeId: text('geo_scope_id')
      .notNull()
      .references(() => geoScopes.id),
    state: text('state').notNull().default('issued'),
    acceptedById: text('accepted_by_id').references(() => people.id),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('community_invites_code_idx').on(table.code)],
);

export const vouchEvidence = sqliteTable(
  'vouch_evidence',
  {
    id: text('id').primaryKey(),
    voucherId: text('voucher_id')
      .notNull()
      .references(() => people.id),
    subjectId: text('subject_id')
      .notNull()
      .references(() => people.id),
    geoScopeId: text('geo_scope_id')
      .notNull()
      .references(() => geoScopes.id),
    statement: text('statement').notNull().default(''),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('vouch_unique_idx').on(table.voucherId, table.subjectId, table.geoScopeId)],
);

export const organizationRoles = sqliteTable('organization_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => people.id),
  organizationName: text('organization_name').notNull(),
  geoScopeId: text('geo_scope_id')
    .notNull()
    .references(() => geoScopes.id),
  role: text('role').notNull(),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
});

export const auditEvents = sqliteTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    at: text('at').notNull(),
    actorId: text('actor_id'),
    action: text('action').notNull(),
    subjectType: text('subject_type').notNull(),
    subjectId: text('subject_id').notNull(),
    metadata: text('metadata').notNull().default('{}'),
  },
  (table) => [index('audit_events_subject_idx').on(table.subjectType, table.subjectId)],
);

/** Closed shape: there is nowhere here to put a coordinate or an identifier. */
export const analyticsEvents = sqliteTable(
  'analytics_events',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    at: text('at').notNull(),
    actorId: text('actor_id'),
    geoScopeId: text('geo_scope_id'),
    practice: text('practice'),
    signalType: text('signal_type'),
    targetId: text('target_id'),
  },
  (table) => [index('analytics_events_scope_idx').on(table.geoScopeId, table.at)],
);
