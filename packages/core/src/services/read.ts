import { buildClusterReport, type ClusterReport } from '../analytics/clusters';
import { canDiscoverUser, canViewPost, canViewProfile,
  canReadSignal,
  canViewSignal,
} from '../policy/access';
import { canPublishInGeo, toActorView } from '../policy/capabilities';
import { deny, type ActorView, type Decision } from '../policy/decision';
import type { SafetyGraph } from '../policy/graph';
import { canVolunteerToHost } from '../policy/hosting';
import {
  canContact,
  canExerciseHostPower,
  canRespondToSignal,
  canSendMessage,
  opensPrivateThread,
  visibleParticipants,
} from '../policy/interaction';
import {
  toPublicAuthor,
  toPublicPost,
  toPublicProfile,
  toPublicSignal,
  type PublicAuthor,
  type PublicPost,
  type PublicProfile,
  type PublicSignal,
} from '../projections';
import { rankDiscover, type RankCandidate } from '../ranking';
import type { Ports } from '../repository';
import type { GeoScope, GeoScopeId, HostOffer, Person, Signal, SignalType, ThreadId, UserId } from '../types';
import { loadActor, loadSafetyGraph } from './context';

interface ReadContext {
  readonly viewer: ActorView;
  readonly viewerPerson: Person;
  readonly graph: SafetyGraph;
  readonly people: ReadonlyMap<UserId, Person>;
  readonly actors: ReadonlyMap<UserId, ActorView>;
  readonly scopes: ReadonlyMap<GeoScopeId, GeoScope>;
  readonly now: string;
}

/**
 * One load per request. Building the actor views and the safety graph up front
 * means every downstream check reads the same consistent snapshot — a block
 * cannot apply to the feed but not to the participant list.
 */
export async function loadReadContext(ports: Ports, viewerId: UserId): Promise<ReadContext | null> {
  const viewer = await loadActor(ports, viewerId);
  if (viewer === null) return null;
  const [people, scopes, graph] = await Promise.all([
    ports.repo.listPeople(),
    ports.repo.listGeoScopes(),
    loadSafetyGraph(ports),
  ]);
  const actors = new Map<UserId, ActorView>();
  for (const person of people) {
    const evidence = await ports.repo.evidenceFor(person.id);
    actors.set(person.id, toActorView(person, evidence));
  }
  return {
    viewer: viewer.view,
    viewerPerson: viewer.person,
    graph,
    people: new Map(people.map((person) => [person.id, person])),
    actors,
    scopes: new Map(scopes.map((scope) => [scope.id, scope])),
    now: ports.now(),
  };
}

function cityName(context: ReadContext, id: GeoScopeId): string {
  return context.scopes.get(id)?.name ?? 'Unknown place';
}

// ---------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------

/**
 * Contextual actions are what stop Discover and Signals from being two separate
 * universes: every card can become a reason to talk to somebody, and each
 * offered action has already been checked against policy before it is rendered.
 */
export type ContextualActionKind = 'ask' | 'offer' | 'join' | 'see_activity' | 'appreciate';

export interface ContextualAction {
  readonly kind: ContextualActionKind;
  readonly label: string;
  readonly signalType: SignalType | null;
  readonly enabled: boolean;
}

export function contextualActionsFor(
  post: PublicPost,
  viewer: ActorView,
  author: ActorView,
  graph: SafetyGraph,
): readonly ContextualAction[] {
  const reachable = !graph.isBlockedBetween(viewer.id, author.id) && viewer.id !== author.id;
  const practice = post.practice;
  return [
    {
      kind: 'ask',
      label: practice === null ? 'Ask about this' : `Ask about ${practice}`,
      signalType: 'ask',
      enabled: reachable,
    },
    {
      kind: 'offer',
      label: 'Offer to help',
      signalType: 'offer',
      enabled: reachable,
    },
    {
      kind: 'join',
      label: 'Propose doing this together',
      signalType: 'join',
      enabled: reachable && viewer.capabilities.has('host'),
    },
    {
      kind: 'see_activity',
      label: `See what ${post.author.displayName} is up to`,
      signalType: null,
      enabled: reachable,
    },
  ];
}

export interface DiscoverCard {
  readonly post: PublicPost;
  readonly score: number;
  readonly breakdown: Readonly<Record<string, number>>;
  readonly actions: readonly ContextualAction[];
}

export async function getDiscoverFeed(
  ports: Ports,
  input: { viewerId: UserId; activeGeoScopeId: GeoScopeId; limit?: number },
): Promise<{ cards: readonly DiscoverCard[]; followed: readonly GeoScopeId[] } | null> {
  const context = await loadReadContext(ports, input.viewerId);
  if (context === null) return null;

  const [posts, attachments, appreciations] = await Promise.all([
    ports.repo.listPosts(),
    ports.repo.listAttachments(input.viewerId),
    ports.repo.listAppreciations(),
  ]);
  const followed = attachments.map((attachment) => attachment.geoScopeId);

  const attachmentsByScope = new Map<GeoScopeId, Set<UserId>>();
  for (const post of posts) {
    attachmentsByScope.set(post.geoScopeId, new Set());
  }
  const allAttachments = await Promise.all(
    [...context.people.keys()].map(
      async (id) => [id, await ports.repo.listAttachments(id)] as const,
    ),
  );
  for (const [userId, list] of allAttachments) {
    for (const attachment of list) {
      attachmentsByScope.get(attachment.geoScopeId)?.add(userId);
    }
  }

  const candidates: RankCandidate[] = [];
  for (const post of posts) {
    const author = context.actors.get(post.authorId);
    if (author === undefined) continue;
    const postAppreciations = appreciations.filter((entry) => entry.postId === post.id);
    const localSet = attachmentsByScope.get(post.geoScopeId) ?? new Set<UserId>();
    candidates.push({
      post,
      author,
      appreciations: postAppreciations.length,
      localAppreciations: postAppreciations.filter((entry) => localSet.has(entry.actorId)).length,
    });
  }

  const ranked = rankDiscover(candidates, {
    viewer: context.viewer,
    viewerInterests: [...context.viewerPerson.interests, ...context.viewerPerson.practices],
    activeGeoScopeId: input.activeGeoScopeId,
    followedGeoScopeIds: followed,
    graph: context.graph,
    now: context.now,
  });

  const cards = ranked.slice(0, input.limit ?? 30).map((entry) => {
    const author = context.people.get(entry.post.authorId);
    const authorView = context.actors.get(entry.post.authorId);
    const postAppreciations = appreciations.filter((item) => item.postId === entry.post.id);
    const publicPost = toPublicPost(
      entry.post,
      author as Person,
      cityName(context, entry.post.geoScopeId),
      postAppreciations.length,
      postAppreciations.some((item) => item.actorId === input.viewerId),
    );
    return {
      post: publicPost,
      score: entry.score,
      breakdown: entry.breakdown,
      actions: contextualActionsFor(publicPost, context.viewer, authorView as ActorView, context.graph),
    };
  });

  return { cards, followed };
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface ProfileView {
  readonly profile: PublicProfile;
  readonly posts: readonly PublicPost[];
  readonly signals: readonly PublicSignal[];
  readonly contact: Decision;
  readonly isSelf: boolean;
}

export async function getProfile(
  ports: Ports,
  input: { viewerId: UserId; handle: string },
): Promise<ProfileView | null> {
  const context = await loadReadContext(ports, input.viewerId);
  if (context === null) return null;
  const person = await ports.repo.getPersonByHandle(input.handle);
  if (person === null) return null;
  const subject = context.actors.get(person.id);
  if (subject === undefined) return null;
  if (!canViewProfile(context.viewer, subject, context.graph).allowed) return null;

  const evidence = await ports.repo.evidenceFor(person.id);
  const [posts, signals, appreciations] = await Promise.all([
    ports.repo.listPosts(),
    ports.repo.listSignals(),
    ports.repo.listAppreciations(),
  ]);

  const authoredPosts = posts
    .filter(
      (post) =>
        post.authorId === person.id &&
        canViewPost(context.viewer, post, subject, context.graph).allowed,
    )
    .map((post) => {
      const postAppreciations = appreciations.filter((entry) => entry.postId === post.id);
      return toPublicPost(
        post,
        person,
        cityName(context, post.geoScopeId),
        postAppreciations.length,
        postAppreciations.some((entry) => entry.actorId === input.viewerId),
      );
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // The same reading floor as a direct link: an adults-only signal never
  // reaches a minor through somebody's profile either (INV-AGE-4).
  const openSignals = signals.filter(
    (signal) =>
      signal.creatorId === person.id &&
      signal.state === 'open' &&
      canReadSignal(context.viewer, signal, subject, context.graph, hostViewOf(context, signal)).allowed,
  );
  const participants = await ports.repo.listParticipants();
  const publicSignals = openSignals.map((signal) =>
    toPublicSignal(
      signal,
      person,
      cityName(context, signal.geoScopeId),
      participants.filter((entry) => entry.signalId === signal.id && entry.state === 'joined').length,
      hostPersonOf(context, signal),
    ),
  );

  const threads = await ports.repo.listThreads(input.viewerId);
  const openThread = threads.find(
    (thread) => thread.state === 'open' && thread.participantIds.includes(person.id),
  );
  // Only a signal this person hosts gives a reason to contact them. Having
  // proposed an activity somebody else hosts does not (ADR-0016): authorship
  // opens no messaging path to the proposer.
  const respondable =
    openSignals.find(
      (signal) =>
        signal.hostId === person.id &&
        canRespondToSignal(context.viewer, signal, subject, context.graph, context.now).allowed,
    ) ?? null;

  return {
    profile: toPublicProfile(person, evidence, context.scopes),
    posts: authoredPosts,
    signals: publicSignals,
    contact: canContact(
      context.viewer,
      subject,
      context.graph,
      { openThreadId: openThread?.id ?? null, respondableSignal: respondable },
      context.now,
    ),
    isSelf: person.id === input.viewerId,
  };
}

/** The people surface. Minors are absent from it for adult viewers by policy. */
export async function getPeopleInCity(
  ports: Ports,
  input: { viewerId: UserId; geoScopeId: GeoScopeId },
): Promise<readonly PublicProfile[] | null> {
  const context = await loadReadContext(ports, input.viewerId);
  if (context === null) return null;

  const results: PublicProfile[] = [];
  for (const person of context.people.values()) {
    const subject = context.actors.get(person.id);
    if (subject === undefined) continue;
    if (!canDiscoverUser(context.viewer, subject, context.graph).allowed) continue;
    const evidence = await ports.repo.evidenceFor(person.id);
    if (!evidence.attachments.some((attachment) => attachment.geoScopeId === input.geoScopeId)) {
      continue;
    }
    results.push(toPublicProfile(person, evidence, context.scopes));
  }
  return results.sort((a, b) => (a.displayName < b.displayName ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export interface SignalCard {
  readonly signal: PublicSignal;
  readonly eligibility: Decision;
  readonly isHost: boolean;
  readonly opensPrivateThread: boolean;
}

export async function listSignals(
  ports: Ports,
  input: { viewerId: UserId; geoScopeId: GeoScopeId | null; type?: SignalType | null },
): Promise<readonly SignalCard[] | null> {
  const context = await loadReadContext(ports, input.viewerId);
  if (context === null) return null;
  const [signals, participants] = await Promise.all([
    ports.repo.listSignals(),
    ports.repo.listParticipants(),
  ]);

  const cards: SignalCard[] = [];
  for (const signal of signals) {
    if (input.geoScopeId !== null && signal.geoScopeId !== input.geoScopeId) continue;
    if (input.type != null && signal.type !== input.type) continue;
    const creator = context.people.get(signal.creatorId);
    const creatorView = context.actors.get(signal.creatorId);
    if (creator === undefined || creatorView === undefined) continue;
    // Removed content, blocked pairs, suspended or restricted authors and
    // adult-only audiences are all decided by one policy, before projection.
    if (!canViewSignal(context.viewer, signal, creatorView, context.graph, hostViewOf(context, signal)).allowed) {
      continue;
    }

    cards.push({
      signal: toPublicSignal(
        signal,
        creator,
        cityName(context, signal.geoScopeId),
        participants.filter((entry) => entry.signalId === signal.id && entry.state === 'joined').length,
        hostPersonOf(context, signal),
      ),
      eligibility: canRespondToSignal(
        context.viewer,
        signal,
        creatorView,
        context.graph,
        context.now,
        hostViewOf(context, signal),
      ),
      isHost: signal.hostId === input.viewerId,
      opensPrivateThread: opensPrivateThread(signal.type),
    });
  }
  return cards.sort((a, b) => (a.signal.createdAt < b.signal.createdAt ? 1 : -1));
}

export interface SignalDetail extends SignalCard {
  readonly participants: readonly PublicAuthor[];
  /** Only ever populated for the host of this object. */
  readonly responses: readonly {
    readonly id: string;
    readonly responder: PublicAuthor;
    readonly message: string;
    readonly state: string;
  }[];
  readonly hostPowers: readonly string[];
  readonly viewerResponded: boolean;
  readonly viewerJoined: boolean;
  /** The viewer published this proposal. Authorship grants no host power. */
  readonly isProposer: boolean;
  /** Pending offers to host, shown only to the proposer of a hostless proposal. */
  readonly hostOffers: readonly { readonly volunteer: PublicAuthor; readonly since: string }[];
  readonly viewerOffered: boolean;
  /** Whether the viewer may offer to host this proposal right now. */
  readonly canVolunteer: Decision;
}

/**
 * The designated host as a person, or null for a hostless proposal. The host
 * is named only to a viewer who may view their profile — the one central rule
 * (`canViewProfile`): never across a block (INV-BLOCK-1), never while the host
 * is suspended (INV-SUSPEND-1), always to the host themself. The proposer keeps
 * reading their own activity; they just do not see a host hidden from them.
 * The stored assignment is untouched.
 */
function hostPersonOf(context: ReadContext, signal: Signal): Person | null {
  if (signal.hostId === null) return null;
  const host = context.actors.get(signal.hostId);
  if (host === undefined || !canViewProfile(context.viewer, host, context.graph).allowed) return null;
  return context.people.get(signal.hostId) ?? null;
}

/** The designated host as policy sees them, or null for a hostless proposal. */
function hostViewOf(context: ReadContext, signal: Signal): ActorView | null {
  return signal.hostId === null ? null : (context.actors.get(signal.hostId) ?? null);
}

export async function getSignalDetail(
  ports: Ports,
  input: { viewerId: UserId; signalId: string },
): Promise<SignalDetail | null> {
  const context = await loadReadContext(ports, input.viewerId);
  if (context === null) return null;
  const signal = await ports.repo.getSignal(input.signalId);
  if (signal === null) return null;
  const creator = context.people.get(signal.creatorId);
  const creatorView = context.actors.get(signal.creatorId);
  if (creator === undefined || creatorView === undefined) return null;
  // Checked before anything else about the signal is loaded or projected. A
  // refusal is indistinguishable from a signal that does not exist, so the
  // page shows its plain not-found rather than a title with a refusal notice.
  if (!canReadSignal(context.viewer, signal, creatorView, context.graph, hostViewOf(context, signal)).allowed) {
    return null;
  }

  const [participants, responses] = await Promise.all([
    ports.repo.listParticipants(signal.id),
    ports.repo.listResponses({ signalId: signal.id }),
  ]);
  const joined = participants.filter((entry) => entry.state === 'joined');
  const isHost = signal.hostId === input.viewerId;

  const visibleIds = visibleParticipants(
    context.viewer,
    joined.map((entry) => entry.userId),
    context.graph,
  );

  // Host offers are private to the volunteer and the proposer (INV-HOST-3):
  // the proposer sees every pending offer they could confirm, a volunteer
  // sees only whether they offered, and everybody else sees nothing.
  const isProposer = signal.creatorId === input.viewerId;
  const offers = signal.plan === null ? [] : await ports.repo.listHostOffers(signal.id);
  const hostOffers =
    isProposer && signal.hostId === null
      ? offers
          .filter((offer) => offer.state === 'pending')
          .map((offer) => ({ offer, volunteer: context.actors.get(offer.volunteerId), person: context.people.get(offer.volunteerId) }))
          .filter(
            (entry): entry is { offer: HostOffer; volunteer: ActorView; person: Person } =>
              entry.volunteer !== undefined &&
              entry.person !== undefined &&
              canViewProfile(context.viewer, entry.volunteer, context.graph).allowed,
          )
          .map((entry) => ({ volunteer: toPublicAuthor(entry.person), since: entry.offer.createdAt }))
      : [];
  const viewerEvidence = await ports.repo.evidenceFor(input.viewerId);

  return {
    signal: toPublicSignal(
      signal,
      creator,
      cityName(context, signal.geoScopeId),
      joined.length,
      hostPersonOf(context, signal),
    ),
    eligibility: canRespondToSignal(
      context.viewer,
      signal,
      creatorView,
      context.graph,
      context.now,
      hostViewOf(context, signal),
    ),
    isProposer,
    hostOffers,
    viewerOffered: offers.some((offer) => offer.volunteerId === input.viewerId && offer.state === 'pending'),
    canVolunteer:
      signal.plan === null
        ? deny('wrong_signal_type')
        : canVolunteerToHost(context.viewer, signal, creatorView, viewerEvidence, context.graph, context.now),
    isHost,
    opensPrivateThread: opensPrivateThread(signal.type),
    participants: visibleIds
      .map((id) => context.people.get(id))
      .filter((person): person is Person => person !== undefined)
      .map(toPublicAuthor),
    responses: isHost
      ? responses
          .map((response) => {
            const responder = context.people.get(response.responderId);
            return responder === undefined
              ? null
              : {
                  id: response.id,
                  responder: toPublicAuthor(responder),
                  message: response.message,
                  state: response.state,
                };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      : [],
    hostPowers: isHost
      ? (['accept_response', 'decline_response', 'remove_participant', 'exclude_participant', 'close_participation'] as const).filter(
          (power) => canExerciseHostPower(context.viewer, signal, power).allowed,
        )
      : [],
    viewerResponded: responses.some((response) => response.responderId === input.viewerId),
    viewerJoined: joined.some((entry) => entry.userId === input.viewerId),
  };
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

export interface ThreadSummary {
  readonly id: ThreadId;
  readonly signalTitle: string;
  readonly signalType: SignalType;
  readonly cityName: string;
  readonly counterpart: PublicAuthor | null;
  readonly lastMessage: string;
  readonly lastAt: string;
  readonly state: 'open' | 'closed';
}

export async function listThreadsFor(
  ports: Ports,
  viewerId: UserId,
): Promise<readonly ThreadSummary[] | null> {
  const context = await loadReadContext(ports, viewerId);
  if (context === null) return null;
  const threads = await ports.repo.listThreads(viewerId);

  const summaries: ThreadSummary[] = [];
  for (const thread of threads) {
    const signal = await ports.repo.getSignal(thread.signalId);
    const messages = await ports.repo.listMessages(thread.id);
    const counterpartId = thread.participantIds.find((id) => id !== viewerId) ?? null;
    const counterpart = counterpartId === null ? null : context.people.get(counterpartId);
    const last = messages[messages.length - 1];
    summaries.push({
      id: thread.id,
      signalTitle: signal?.title ?? 'Removed signal',
      signalType: signal?.type ?? 'ask',
      cityName: signal === null || signal === undefined ? '' : cityName(context, signal.geoScopeId),
      counterpart: counterpart === undefined || counterpart === null ? null : toPublicAuthor(counterpart),
      lastMessage: last?.body ?? '',
      lastAt: last?.createdAt ?? thread.createdAt,
      state: thread.state,
    });
  }
  return summaries.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

export interface ThreadView {
  readonly id: ThreadId;
  readonly state: 'open' | 'closed';
  readonly signalTitle: string;
  readonly signalId: string;
  readonly cityName: string;
  readonly counterpart: PublicAuthor | null;
  readonly canSend: Decision;
  readonly messages: readonly {
    readonly id: string;
    readonly authorId: UserId;
    readonly authorName: string;
    readonly body: string;
    readonly createdAt: string;
  }[];
}

export async function getThreadView(
  ports: Ports,
  input: { viewerId: UserId; threadId: ThreadId },
): Promise<ThreadView | null> {
  const context = await loadReadContext(ports, input.viewerId);
  if (context === null) return null;
  const thread = await ports.repo.getThread(input.threadId);
  if (thread === null || !thread.participantIds.includes(input.viewerId)) return null;

  const [signal, messages] = await Promise.all([
    ports.repo.getSignal(thread.signalId),
    ports.repo.listMessages(thread.id),
  ]);
  const counterpartId = thread.participantIds.find((id) => id !== input.viewerId) ?? null;
  const counterpart = counterpartId === null ? undefined : context.people.get(counterpartId);

  return {
    id: thread.id,
    state: thread.state,
    signalTitle: signal?.title ?? 'Removed signal',
    signalId: thread.signalId,
    cityName: signal === null ? '' : cityName(context, signal.geoScopeId),
    counterpart: counterpart === undefined ? null : toPublicAuthor(counterpart),
    canSend: canSendMessage(context.viewer, thread, context.graph),
    messages: messages.map((message) => ({
      id: message.id,
      authorId: message.authorId,
      authorName: context.people.get(message.authorId)?.displayName ?? 'Unknown',
      body: message.body,
      createdAt: message.createdAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// Places and insights
// ---------------------------------------------------------------------------

export interface PlaceRow {
  readonly geoScopeId: GeoScopeId;
  readonly name: string;
  readonly countryCode: string;
  readonly kind: string;
  readonly canPublishLocally: boolean;
}

export async function getMyPlaces(ports: Ports, viewerId: UserId): Promise<readonly PlaceRow[]> {
  const [attachments, scopes, evidence] = await Promise.all([
    ports.repo.listAttachments(viewerId),
    ports.repo.listGeoScopes(),
    ports.repo.evidenceFor(viewerId),
  ]);
  const person = await ports.repo.getPerson(viewerId);
  if (person === null) return [];
  const view = toActorView(person, evidence);
  const byId = new Map(scopes.map((scope) => [scope.id, scope]));

  return attachments.map((attachment) => {
    const scope = byId.get(attachment.geoScopeId);
    return {
      geoScopeId: attachment.geoScopeId,
      name: scope?.name ?? 'Unknown place',
      countryCode: scope?.countryCode ?? '',
      kind: attachment.kind,
      canPublishLocally: canPublishInGeo(view, attachment.geoScopeId, evidence).allowed,
    };
  });
}

/**
 * The accounts this person has blocked, so they can undo it.
 *
 * Only the edges this viewer created: being blocked by somebody is not
 * something they get to see (INV-BLOCK-1 hides the account entirely, and a
 * "who blocked me" list would defeat that).
 */
export async function listBlockedBy(
  ports: Ports,
  viewerId: UserId,
): Promise<readonly PublicAuthor[]> {
  const [blocks, people] = await Promise.all([ports.repo.listBlocks(), ports.repo.listPeople()]);
  const byId = new Map(people.map((person) => [person.id, person]));
  return blocks
    .filter((block) => block.blockerId === viewerId)
    .map((block) => byId.get(block.blockedId))
    .filter((person): person is Person => person !== undefined)
    .map(toPublicAuthor);
}

export interface InsightsView {
  readonly report: ClusterReport;
  readonly scopeNames: Readonly<Record<string, string>>;
  readonly totals: {
    readonly events: number;
    readonly people: number;
    readonly posts: number;
    readonly signals: number;
    readonly threads: number;
  };
}

/**
 * "Where is this starting to work?" — answered from behaviour, with no city
 * privileged in the code.
 */
export async function getInsights(ports: Ports): Promise<InsightsView> {
  const [events, scopes, people, posts, signals, threads] = await Promise.all([
    ports.repo.listAnalytics(),
    ports.repo.listGeoScopes(),
    ports.repo.listPeople(),
    ports.repo.listPosts(),
    ports.repo.listSignals(),
    ports.repo.listThreads(),
  ]);
  const postsByScope = new Map<GeoScopeId, number>();
  for (const post of posts) {
    postsByScope.set(post.geoScopeId, (postsByScope.get(post.geoScopeId) ?? 0) + 1);
  }
  const scopeNames: Record<string, string> = {};
  for (const scope of scopes) scopeNames[scope.id] = scope.name;

  return {
    report: buildClusterReport(events, postsByScope),
    scopeNames,
    totals: {
      events: events.length,
      people: people.length,
      posts: posts.length,
      signals: signals.length,
      threads: threads.length,
    },
  };
}
