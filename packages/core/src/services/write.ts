import { canAppreciate, canViewPost } from '../policy/access';
import { ageBandFromAge } from '../policy/age';
import { canInvite, canPublishInGeo, canVouch } from '../policy/capabilities';
import { requireActive } from '../policy/decision';
import {
  canExerciseHostPower,
  canHost,
  canJoinEvent,
  canOpenScopedThread,
  canRespondToSignal,
  canSendMessage,
  opensPrivateThread,
} from '../policy/interaction';
import type { Ports } from '../repository';
import type {
  AgeBand,
  ContentAudience,
  GeoAttachmentKind,
  GeoScopeId,
  PostId,
  ReportReason,
  ReportTargetType,
  SignalId,
  SignalType,
  ThreadId,
  UserId,
} from '../types';
import { audit, fail, loadActor, loadSafetyGraph, ok, track, type ServiceResult } from './context';

const MAX_CAPTION = 400;
const MAX_MESSAGE = 2000;
const MAX_FACET = 40;
const MAX_FACETS = 12;

function clean(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/**
 * Free-text self-description. Bounded and de-duplicated case-insensitively so
 * the same word typed three ways is one tag, which is what makes practices
 * usable as an affinity term in ranking.
 */
function cleanFacets(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = clean(value, MAX_FACET);
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length === MAX_FACETS) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface ProfileFacetsInput {
  readonly actorId: UserId;
  readonly practices?: readonly string[];
  readonly interests?: readonly string[];
  readonly canHelpWith?: readonly string[];
  readonly wantsToLearn?: readonly string[];
}

/**
 * What a person says they do. Only the account itself can write these: there is
 * no `subjectId` parameter, so there is no shape in which this becomes a way to
 * edit somebody else.
 */
export async function setProfileFacets(
  ports: Ports,
  input: ProfileFacetsInput,
): Promise<ServiceResult<{ userId: UserId }>> {
  const person = await ports.repo.getPerson(input.actorId);
  if (person === null) return fail('not_found');

  await ports.repo.putPerson({
    ...person,
    practices: input.practices === undefined ? person.practices : cleanFacets(input.practices),
    interests: input.interests === undefined ? person.interests : cleanFacets(input.interests),
    canHelpWith: input.canHelpWith === undefined ? person.canHelpWith : cleanFacets(input.canHelpWith),
    wantsToLearn:
      input.wantsToLearn === undefined ? person.wantsToLearn : cleanFacets(input.wantsToLearn),
  });
  return ok({ userId: person.id });
}

/**
 * First run: a declared age, a first place, and what you do.
 *
 * The declared age is converted to a band by policy and then dropped on the
 * floor — nothing downstream is given the number, and the attestation this
 * writes records only the threshold that was checked (ADR-0002, INV-AGE-1).
 *
 * The band is also checked against the account it is being applied to, so a
 * declared age cannot quietly promote a minor account into the adult band.
 */
export async function completeOnboarding(
  ports: Ports,
  input: {
    actorId: UserId;
    declaredAge: number;
    geoScopeId: GeoScopeId;
    kind: GeoAttachmentKind;
    practices?: readonly string[];
    interests?: readonly string[];
    canHelpWith?: readonly string[];
    wantsToLearn?: readonly string[];
  },
): Promise<ServiceResult<{ ageBand: AgeBand; geoScopeId: GeoScopeId }>> {
  const ageBand = ageBandFromAge(input.declaredAge);
  if (ageBand === null) return fail('age_below_minimum');

  const person = await ports.repo.getPerson(input.actorId);
  if (person === null) return fail('not_found');
  if (person.ageBand !== ageBand) return fail('age_band_mismatch');

  const placed = await addCity(ports, {
    actorId: input.actorId,
    geoScopeId: input.geoScopeId,
    kind: input.kind,
  });
  if (!placed.ok) return fail(placed.reason);

  const facets = await setProfileFacets(ports, input);
  if (!facets.ok) return fail(facets.reason);

  await ports.repo.putAttestation({
    id: ports.newId('att'),
    subjectId: input.actorId,
    kind: 'age_threshold_verified',
    geoScopeId: null,
    result: 'verified',
    method: 'self_declared',
    providerRef: null,
    // The threshold that was checked. Never the age that was typed.
    ageThreshold: ageBand === 'adult_18_plus' ? 18 : 15,
    country: null,
    issuedAt: ports.now(),
    expiresAt: null,
  });

  return ok({ ageBand, geoScopeId: input.geoScopeId });
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

/**
 * Adding a city is free — exploring anywhere is a right, and it is also the
 * signal we need in order to discover where the product is being adopted.
 * Publishing *as a local* is the part that asks for evidence.
 */
export async function addCity(
  ports: Ports,
  input: { actorId: UserId; geoScopeId: GeoScopeId; kind: GeoAttachmentKind },
): Promise<ServiceResult<{ geoScopeId: GeoScopeId }>> {
  const actor = await loadActor(ports, input.actorId);
  if (actor === null) return fail('not_found');
  const scope = await ports.repo.getGeoScope(input.geoScopeId);
  if (scope === null) return fail('not_found');
  const active = requireActive(actor.view);
  if (!active.allowed) return fail(active.reason);

  // Only 'exploring' and 'visitor' are self-assertable. Stronger ties are
  // recorded as declared here and only become capability-bearing once other
  // evidence (attestation or vouches) backs them; see canPublishInGeo.
  await ports.repo.putAttachment({
    userId: input.actorId,
    geoScopeId: input.geoScopeId,
    kind: input.kind,
    evidence: 'declared',
    since: ports.now(),
  });
  await track(ports, { name: 'city_added', actorId: input.actorId, geoScopeId: input.geoScopeId });
  await audit(ports, {
    actorId: input.actorId,
    action: 'city_added',
    subjectType: 'geo_scope',
    subjectId: input.geoScopeId,
    metadata: { kind: input.kind },
  });
  return ok({ geoScopeId: input.geoScopeId });
}

export async function removeCity(
  ports: Ports,
  input: { actorId: UserId; geoScopeId: GeoScopeId },
): Promise<ServiceResult<{ geoScopeId: GeoScopeId }>> {
  await ports.repo.deleteAttachment(input.actorId, input.geoScopeId);
  await track(ports, { name: 'city_removed', actorId: input.actorId, geoScopeId: input.geoScopeId });
  return ok({ geoScopeId: input.geoScopeId });
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export async function createPost(
  ports: Ports,
  input: {
    actorId: UserId;
    geoScopeId: GeoScopeId;
    caption: string;
    practice: string | null;
    motif: string;
    audience?: ContentAudience;
  },
): Promise<ServiceResult<{ postId: PostId }>> {
  const actor = await loadActor(ports, input.actorId);
  if (actor === null) return fail('not_found');
  const caption = clean(input.caption, MAX_CAPTION);
  if (caption.length === 0) return fail('invalid_input');

  const decision = canPublishInGeo(actor.view, input.geoScopeId, actor.evidence);
  if (!decision.allowed) return fail(decision.reason);

  const id = ports.newId('post');
  await ports.repo.putPost({
    id,
    authorId: input.actorId,
    geoScopeId: input.geoScopeId,
    caption,
    practice: input.practice,
    media: {
      id: ports.newId('media'),
      kind: 'image',
      alt: caption,
      seed: id,
      motif: input.motif,
      metadataStripped: true,
    },
    audience: input.audience ?? 'all',
    state: 'published',
    createdAt: ports.now(),
    demo: true,
  });
  await track(ports, {
    name: 'signal_open',
    actorId: input.actorId,
    geoScopeId: input.geoScopeId,
    practice: input.practice,
    targetId: id,
  });
  return ok({ postId: id });
}

/** Appreciation is a toggle on a piece of content, never a score on a person. */
export async function toggleAppreciation(
  ports: Ports,
  input: { actorId: UserId; postId: PostId },
): Promise<ServiceResult<{ appreciated: boolean; count: number }>> {
  const [actor, post, graph] = await Promise.all([
    loadActor(ports, input.actorId),
    ports.repo.getPost(input.postId),
    loadSafetyGraph(ports),
  ]);
  if (actor === null || post === null) return fail('not_found');
  const author = await loadActor(ports, post.authorId);
  if (author === null) return fail('not_found');

  const decision = canAppreciate(actor.view, post, author.view, graph);
  if (!decision.allowed) return fail(decision.reason);

  const existing = await ports.repo.listAppreciations(post.id);
  const already = existing.some((entry) => entry.actorId === input.actorId);
  if (already) {
    await ports.repo.deleteAppreciation(post.id, input.actorId);
    return ok({ appreciated: false, count: existing.length - 1 });
  }
  await ports.repo.putAppreciation({
    id: ports.newId('appr'),
    postId: post.id,
    actorId: input.actorId,
    createdAt: ports.now(),
  });
  await track(ports, {
    name: 'appreciation_created',
    actorId: input.actorId,
    geoScopeId: post.geoScopeId,
    practice: post.practice,
    targetId: post.id,
  });
  return ok({ appreciated: true, count: existing.length + 1 });
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export async function createSignal(
  ports: Ports,
  input: {
    actorId: UserId;
    type: SignalType;
    title: string;
    body: string;
    geoScopeId: GeoScopeId;
    practice?: string | null;
    placeLabel?: string | null;
    startsAt?: string | null;
    expiresAt?: string | null;
    capacity?: number | null;
    linkedPostId?: PostId | null;
    audience?: ContentAudience;
  },
): Promise<ServiceResult<{ signalId: SignalId }>> {
  const actor = await loadActor(ports, input.actorId);
  if (actor === null) return fail('not_found');
  const title = clean(input.title, 120);
  const body = clean(input.body, MAX_CAPTION);
  if (title.length === 0) return fail('invalid_input');

  const active = requireActive(actor.view);
  if (!active.allowed) return fail(active.reason);

  // Hosting a gathering is the one intent that asks for both the host
  // capability and a real tie to the place it happens in.
  if (input.type === 'event' || input.type === 'join') {
    const hosting = canHost(actor.view);
    if (!hosting.allowed) return fail(hosting.reason);
    const local = canPublishInGeo(actor.view, input.geoScopeId, actor.evidence);
    if (!local.allowed) return fail(local.reason);
  } else {
    const attachments = await ports.repo.listAttachments(input.actorId);
    const attached = attachments.some((attachment) => attachment.geoScopeId === input.geoScopeId);
    if (!attached) return fail('no_local_attachment');
  }

  const id = ports.newId('sig');
  await ports.repo.putSignal({
    id,
    creatorId: input.actorId,
    type: input.type,
    title,
    body,
    geoScopeId: input.geoScopeId,
    practice: input.practice ?? null,
    linkedPostId: input.linkedPostId ?? null,
    placeLabel: input.placeLabel ?? null,
    startsAt: input.startsAt ?? null,
    expiresAt: input.expiresAt ?? null,
    capacity: input.capacity ?? null,
    audience: input.audience ?? 'all',
    state: 'open',
    createdAt: ports.now(),
    demo: true,
  });
  await track(ports, {
    name: 'signal_created',
    actorId: input.actorId,
    geoScopeId: input.geoScopeId,
    practice: input.practice ?? null,
    signalType: input.type,
    targetId: id,
  });
  return ok({ signalId: id });
}

export async function respondToSignal(
  ports: Ports,
  input: { actorId: UserId; signalId: SignalId; message: string },
): Promise<ServiceResult<{ responseId: string; joined: boolean }>> {
  const [actor, signal, graph] = await Promise.all([
    loadActor(ports, input.actorId),
    ports.repo.getSignal(input.signalId),
    loadSafetyGraph(ports),
  ]);
  if (actor === null || signal === null) return fail('not_found');
  const creator = await loadActor(ports, signal.creatorId);
  if (creator === null) return fail('not_found');

  const decision = canRespondToSignal(actor.view, signal, creator.view, graph, ports.now());
  if (!decision.allowed) return fail(decision.reason);

  const responseId = ports.newId('resp');
  await ports.repo.putResponse({
    id: responseId,
    signalId: signal.id,
    responderId: input.actorId,
    message: clean(input.message, MAX_MESSAGE),
    state: 'pending',
    createdAt: ports.now(),
  });
  await track(ports, {
    name: 'signal_response',
    actorId: input.actorId,
    geoScopeId: signal.geoScopeId,
    practice: signal.practice,
    signalType: signal.type,
    targetId: signal.id,
  });
  return ok({ responseId, joined: false });
}

export async function joinSignal(
  ports: Ports,
  input: { actorId: UserId; signalId: SignalId },
): Promise<ServiceResult<{ signalId: SignalId }>> {
  const [actor, signal, graph] = await Promise.all([
    loadActor(ports, input.actorId),
    ports.repo.getSignal(input.signalId),
    loadSafetyGraph(ports),
  ]);
  if (actor === null || signal === null) return fail('not_found');
  const creator = await loadActor(ports, signal.creatorId);
  if (creator === null) return fail('not_found');

  const participants = await ports.repo.listParticipants(signal.id);
  const joinedCount = participants.filter((entry) => entry.state === 'joined').length;
  const decision = canJoinEvent(actor.view, signal, creator.view, graph, joinedCount, ports.now());
  if (!decision.allowed) return fail(decision.reason);

  await ports.repo.putParticipant({
    signalId: signal.id,
    userId: input.actorId,
    state: 'joined',
    joinedAt: ports.now(),
  });
  await track(ports, {
    name: 'participant_joined',
    actorId: input.actorId,
    geoScopeId: signal.geoScopeId,
    signalType: signal.type,
    targetId: signal.id,
  });
  return ok({ signalId: signal.id });
}

/**
 * Host decision on a response. Accepting an Ask/Offer is the *only* way a
 * private thread comes into existence.
 */
export async function decideResponse(
  ports: Ports,
  input: { hostId: UserId; responseId: string; decision: 'accepted' | 'declined' },
): Promise<ServiceResult<{ threadId: ThreadId | null }>> {
  const response = await ports.repo.getResponse(input.responseId);
  if (response === null) return fail('not_found');
  const [host, signal, graph] = await Promise.all([
    loadActor(ports, input.hostId),
    ports.repo.getSignal(response.signalId),
    loadSafetyGraph(ports),
  ]);
  if (host === null || signal === null) return fail('not_found');

  const power = canExerciseHostPower(
    host.view,
    signal,
    input.decision === 'accepted' ? 'accept_response' : 'decline_response',
  );
  if (!power.allowed) return fail(power.reason);

  const responder = await loadActor(ports, response.responderId);
  if (responder === null) return fail('not_found');

  await ports.repo.putResponse({ ...response, state: input.decision });
  await audit(ports, {
    actorId: input.hostId,
    action: `response_${input.decision}`,
    subjectType: 'signal_response',
    subjectId: response.id,
  });

  if (input.decision !== 'accepted') return ok({ threadId: null });

  if (!opensPrivateThread(signal.type)) {
    await ports.repo.putParticipant({
      signalId: signal.id,
      userId: responder.person.id,
      state: 'joined',
      joinedAt: ports.now(),
    });
    return ok({ threadId: null });
  }

  const allowed = canOpenScopedThread(
    host.view,
    responder.view,
    { signalType: signal.type, response: { state: 'accepted', signalId: signal.id } },
    graph,
  );
  if (!allowed.allowed) return fail(allowed.reason);

  const threadId = ports.newId('thr');
  await ports.repo.putThread({
    id: threadId,
    signalId: signal.id,
    responseId: response.id,
    participantIds: [host.person.id, responder.person.id],
    state: 'open',
    createdAt: ports.now(),
  });
  // The response text becomes the first message so the thread keeps the context
  // that justified it.
  await ports.repo.putMessage({
    id: ports.newId('msg'),
    threadId,
    authorId: responder.person.id,
    body: response.message,
    createdAt: ports.now(),
  });
  await track(ports, {
    name: 'thread_started',
    actorId: input.hostId,
    geoScopeId: signal.geoScopeId,
    signalType: signal.type,
    targetId: threadId,
  });
  return ok({ threadId });
}

export async function removeParticipant(
  ports: Ports,
  input: { hostId: UserId; signalId: SignalId; userId: UserId; exclude: boolean; reason?: string },
): Promise<ServiceResult<{ excluded: boolean }>> {
  const [host, signal] = await Promise.all([
    loadActor(ports, input.hostId),
    ports.repo.getSignal(input.signalId),
  ]);
  if (host === null || signal === null) return fail('not_found');
  const power = canExerciseHostPower(
    host.view,
    signal,
    input.exclude ? 'exclude_participant' : 'remove_participant',
  );
  if (!power.allowed) return fail(power.reason);

  await ports.repo.putParticipant({
    signalId: signal.id,
    userId: input.userId,
    state: 'removed',
    joinedAt: ports.now(),
  });
  if (input.exclude) {
    await ports.repo.putHostExclusion({
      signalId: signal.id,
      userId: input.userId,
      byHostId: input.hostId,
      reason: clean(input.reason ?? '', 200),
      at: ports.now(),
    });
  }
  // A removed participant also loses the thread that the object created.
  const threads = await ports.repo.listThreads(input.userId);
  for (const thread of threads) {
    if (thread.signalId === signal.id && thread.state === 'open') {
      await ports.repo.putThread({ ...thread, state: 'closed' });
    }
  }
  await track(ports, {
    name: 'participant_removed',
    actorId: input.hostId,
    geoScopeId: signal.geoScopeId,
    signalType: signal.type,
    targetId: signal.id,
  });
  await audit(ports, {
    actorId: input.hostId,
    action: input.exclude ? 'participant_excluded' : 'participant_removed',
    subjectType: 'signal',
    subjectId: signal.id,
    metadata: { userId: input.userId },
  });
  return ok({ excluded: input.exclude });
}

export async function closeSignal(
  ports: Ports,
  input: { hostId: UserId; signalId: SignalId },
): Promise<ServiceResult<{ signalId: SignalId }>> {
  const [host, signal] = await Promise.all([
    loadActor(ports, input.hostId),
    ports.repo.getSignal(input.signalId),
  ]);
  if (host === null || signal === null) return fail('not_found');
  const power = canExerciseHostPower(host.view, signal, 'close_participation');
  if (!power.allowed) return fail(power.reason);
  await ports.repo.putSignal({ ...signal, state: 'closed' });
  return ok({ signalId: signal.id });
}

// ---------------------------------------------------------------------------
// Scoped interaction
// ---------------------------------------------------------------------------

export async function sendMessage(
  ports: Ports,
  input: { actorId: UserId; threadId: ThreadId; body: string },
): Promise<ServiceResult<{ messageId: string }>> {
  const [actor, thread, graph] = await Promise.all([
    loadActor(ports, input.actorId),
    ports.repo.getThread(input.threadId),
    loadSafetyGraph(ports),
  ]);
  if (actor === null || thread === null) return fail('not_found');
  const body = clean(input.body, MAX_MESSAGE);
  if (body.length === 0) return fail('invalid_input');

  const decision = canSendMessage(actor.view, thread, graph);
  if (!decision.allowed) return fail(decision.reason);

  const id = ports.newId('msg');
  await ports.repo.putMessage({
    id,
    threadId: thread.id,
    authorId: input.actorId,
    body,
    createdAt: ports.now(),
  });
  const signal = await ports.repo.getSignal(thread.signalId);
  await track(ports, {
    name: 'message_sent',
    actorId: input.actorId,
    geoScopeId: signal?.geoScopeId ?? null,
    signalType: signal?.type ?? null,
    targetId: thread.id,
  });
  return ok({ messageId: id });
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

/**
 * Blocking is structural: beyond the edge itself, every shared scoped thread is
 * closed immediately. Discovery, feed and eligibility effects come from the
 * policy layer reading the same edge, so there is nothing to keep in sync.
 */
export async function blockUser(
  ports: Ports,
  input: { actorId: UserId; targetId: UserId },
): Promise<ServiceResult<{ blocked: true }>> {
  if (input.actorId === input.targetId) return fail('self');
  const [actor, target] = await Promise.all([
    loadActor(ports, input.actorId),
    ports.repo.getPerson(input.targetId),
  ]);
  if (actor === null || target === null) return fail('not_found');

  await ports.repo.putBlock({
    id: ports.newId('blk'),
    blockerId: input.actorId,
    blockedId: input.targetId,
    createdAt: ports.now(),
  });

  const threads = await ports.repo.listThreads(input.actorId);
  for (const thread of threads) {
    if (thread.participantIds.includes(input.targetId) && thread.state === 'open') {
      await ports.repo.putThread({ ...thread, state: 'closed' });
    }
  }
  await track(ports, { name: 'block_created', actorId: input.actorId, targetId: input.targetId });
  await audit(ports, {
    actorId: input.actorId,
    action: 'block_created',
    subjectType: 'user',
    subjectId: input.targetId,
  });
  return ok({ blocked: true });
}

export async function unblockUser(
  ports: Ports,
  input: { actorId: UserId; targetId: UserId },
): Promise<ServiceResult<{ blocked: false }>> {
  await ports.repo.deleteBlock(input.actorId, input.targetId);
  await audit(ports, {
    actorId: input.actorId,
    action: 'block_removed',
    subjectType: 'user',
    subjectId: input.targetId,
  });
  return ok({ blocked: false });
}

/**
 * A report opens (or joins) a moderation case. The case is never visible to the
 * reported person, and the reporter only ever sees their own report
 * (INV-MOD-1). Machine triage labels may be attached later; they never decide.
 */
export async function reportContent(
  ports: Ports,
  input: {
    reporterId: UserId;
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    note?: string;
  },
): Promise<ServiceResult<{ reportId: string; caseId: string }>> {
  const reporter = await loadActor(ports, input.reporterId);
  if (reporter === null) return fail('not_found');

  const cases = await ports.repo.listModerationCases();
  const existing = cases.find(
    (entry) =>
      entry.targetType === input.targetType &&
      entry.targetId === input.targetId &&
      (entry.state === 'open' || entry.state === 'triaged'),
  );

  const reportId = ports.newId('rep');
  const caseId = existing?.id ?? ports.newId('case');
  await ports.repo.putReport({
    id: reportId,
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    note: clean(input.note ?? '', 500),
    caseId,
    createdAt: ports.now(),
  });
  await ports.repo.putModerationCase(
    existing
      ? { ...existing, reportIds: [...existing.reportIds, reportId] }
      : {
          id: caseId,
          targetType: input.targetType,
          targetId: input.targetId,
          state: 'open',
          reportIds: [reportId],
          triageLabels: [],
          createdAt: ports.now(),
        },
  );
  await track(ports, { name: 'report_created', actorId: input.reporterId, targetId: input.targetId });
  await audit(ports, {
    actorId: input.reporterId,
    action: 'report_created',
    subjectType: input.targetType,
    subjectId: input.targetId,
    metadata: { reason: input.reason },
  });
  return ok({ reportId, caseId });
}

// ---------------------------------------------------------------------------
// Community invitation and vouching
// ---------------------------------------------------------------------------

export async function createInvite(
  ports: Ports,
  input: { actorId: UserId; geoScopeId: GeoScopeId },
): Promise<ServiceResult<{ code: string }>> {
  const actor = await loadActor(ports, input.actorId);
  if (actor === null) return fail('not_found');
  const decision = canInvite(actor.view);
  if (!decision.allowed) return fail(decision.reason);

  const code = ports.newId('inv').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  await ports.repo.putInvite({
    id: ports.newId('invite'),
    code,
    inviterId: input.actorId,
    geoScopeId: input.geoScopeId,
    state: 'issued',
    acceptedById: null,
    createdAt: ports.now(),
  });
  await track(ports, {
    name: 'invite_created',
    actorId: input.actorId,
    geoScopeId: input.geoScopeId,
  });
  return ok({ code });
}

export async function acceptInvite(
  ports: Ports,
  input: { actorId: UserId; code: string },
): Promise<ServiceResult<{ geoScopeId: GeoScopeId }>> {
  const invites = await ports.repo.listInvites();
  const invite = invites.find((entry) => entry.code === input.code && entry.state === 'issued');
  if (invite === undefined) return fail('not_found');
  if (invite.inviterId === input.actorId) return fail('self');

  await ports.repo.putInvite({ ...invite, state: 'accepted', acceptedById: input.actorId });
  await track(ports, {
    name: 'invite_accepted',
    actorId: input.actorId,
    geoScopeId: invite.geoScopeId,
  });
  return ok({ geoScopeId: invite.geoScopeId });
}

/**
 * A vouch is evidence, not authority. It contributes to local publishing (two
 * independent vouches stand in for an attested presence) and to nothing else.
 */
export async function createVouch(
  ports: Ports,
  input: { actorId: UserId; subjectId: UserId; geoScopeId: GeoScopeId; statement: string },
): Promise<ServiceResult<{ vouchId: string }>> {
  const [voucher, subject, graph] = await Promise.all([
    loadActor(ports, input.actorId),
    loadActor(ports, input.subjectId),
    loadSafetyGraph(ports),
  ]);
  if (voucher === null || subject === null) return fail('not_found');
  const decision = canVouch(
    voucher.view,
    subject.view,
    graph.isBlockedBetween(input.actorId, input.subjectId),
  );
  if (!decision.allowed) return fail(decision.reason);

  const existing = await ports.repo.listVouches(input.subjectId);
  if (existing.some((entry) => entry.voucherId === input.actorId && entry.geoScopeId === input.geoScopeId)) {
    return fail('conflict');
  }

  const id = ports.newId('vouch');
  await ports.repo.putVouch({
    id,
    voucherId: input.actorId,
    subjectId: input.subjectId,
    geoScopeId: input.geoScopeId,
    statement: clean(input.statement, 240),
    createdAt: ports.now(),
  });
  await track(ports, { name: 'vouch_created', actorId: input.actorId, geoScopeId: input.geoScopeId });
  return ok({ vouchId: id });
}

/**
 * Self-reported real-world outcome. This is the metric the whole product exists
 * to move, so it is instrumented even though it is only ever self-declared.
 */
export async function recordLocalOutcome(
  ports: Ports,
  input: { actorId: UserId; signalId: SignalId },
): Promise<ServiceResult<{ recorded: true }>> {
  const signal = await ports.repo.getSignal(input.signalId);
  if (signal === null) return fail('not_found');
  await track(ports, {
    name: 'local_outcome_recorded',
    actorId: input.actorId,
    geoScopeId: signal.geoScopeId,
    signalType: signal.type,
    practice: signal.practice,
    targetId: signal.id,
  });
  return ok({ recorded: true });
}

/** Recorded when a viewer opens a post, for cluster analytics only. */
export async function trackContentOpen(
  ports: Ports,
  input: { actorId: UserId; postId: PostId },
): Promise<ServiceResult<{ tracked: boolean }>> {
  const [actor, post, graph] = await Promise.all([
    loadActor(ports, input.actorId),
    ports.repo.getPost(input.postId),
    loadSafetyGraph(ports),
  ]);
  if (actor === null || post === null) return fail('not_found');
  const author = await loadActor(ports, post.authorId);
  if (author === null) return fail('not_found');
  const decision = canViewPost(actor.view, post, author.view, graph);
  if (!decision.allowed) return fail(decision.reason);
  await track(ports, {
    name: 'content_open',
    actorId: input.actorId,
    geoScopeId: post.geoScopeId,
    practice: post.practice,
    targetId: post.id,
  });
  return ok({ tracked: true });
}
