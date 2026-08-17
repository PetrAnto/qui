import type { Instant, Signal, SignalResponse, SignalType, Thread, UserId } from '../types';
import { canSeeAudience, canSharePrivateSpace } from './age';
import {
  ALLOW,
  all,
  deny,
  requireActive,
  requireCapability,
  type ActorView,
  type Decision,
} from './decision';
import type { SafetyGraph } from './graph';

/**
 * Signal types whose response opens a private two-person thread. Group types
 * ('join', 'event') put people in a hosted space instead, which is why they can
 * legitimately mix age bands and these cannot.
 */
const PRIVATE_THREAD_TYPES: ReadonlySet<SignalType> = new Set<SignalType>(['ask', 'offer']);
const GROUP_TYPES: ReadonlySet<SignalType> = new Set<SignalType>(['join', 'event']);

export function opensPrivateThread(type: SignalType): boolean {
  return PRIVATE_THREAD_TYPES.has(type);
}

function isLive(signal: Signal, now: Instant): boolean {
  if (signal.state !== 'open') return false;
  if (signal.expiresAt !== null && signal.expiresAt <= now) return false;
  return true;
}

/**
 * INV-DM-1 lives here. Contact always starts from a signal somebody chose to
 * publish; there is no function anywhere that opens a conversation without one.
 */
export function canRespondToSignal(
  responder: ActorView,
  signal: Signal,
  creator: ActorView,
  graph: SafetyGraph,
  now: Instant,
): Decision {
  if (responder.id === creator.id) return deny('self');
  if (graph.isBlockedBetween(responder.id, creator.id)) return deny('blocked');
  if (creator.accountState === 'suspended') return deny('author_suspended');
  // INV-HOST-1: exclusion from a hosted object is permanent for that object.
  if (graph.isHostExcluded(signal.id, responder.id)) return deny('host_excluded');
  if (!isLive(signal, now)) return deny('signal_not_open');

  const base = all(
    requireActive(responder),
    requireCapability(responder, 'respond_to_unknown_people'),
    canSeeAudience(responder, signal.audience),
  );
  if (!base.allowed) return base;

  // Answering an Ask or an Offer means a private thread, so the age-band rule
  // applies at the door rather than after the fact.
  if (opensPrivateThread(signal.type)) {
    return canSharePrivateSpace(responder, creator);
  }
  return ALLOW;
}

export function canJoinEvent(
  joiner: ActorView,
  signal: Signal,
  creator: ActorView,
  graph: SafetyGraph,
  joinedCount: number,
  now: Instant,
): Decision {
  if (!GROUP_TYPES.has(signal.type)) return deny('wrong_signal_type');
  const eligible = canRespondToSignal(joiner, signal, creator, graph, now);
  if (!eligible.allowed) return eligible;
  if (signal.capacity !== null && joinedCount >= signal.capacity) return deny('signal_full');
  return ALLOW;
}

export interface ThreadContext {
  readonly signalType: SignalType;
  readonly response: Pick<SignalResponse, 'state' | 'signalId'>;
}

/**
 * A thread is a consequence, never an origin: it requires an accepted response
 * to a signal, both parties active, no block, and the same age band.
 */
export function canOpenScopedThread(
  creator: ActorView,
  responder: ActorView,
  context: ThreadContext,
  graph: SafetyGraph,
): Decision {
  if (creator.id === responder.id) return deny('self');
  if (context.response.state !== 'accepted') return deny('no_signal_context');
  if (!opensPrivateThread(context.signalType)) return deny('wrong_signal_type');
  if (graph.isBlockedBetween(creator.id, responder.id)) return deny('blocked');
  return all(
    requireActive(creator),
    requireActive(responder),
    canSharePrivateSpace(creator, responder),
  );
}

export function canSendMessage(
  actor: ActorView,
  thread: Thread,
  graph: SafetyGraph,
): Decision {
  if (!thread.participantIds.includes(actor.id)) return deny('not_participant');
  if (thread.state !== 'open') return deny('thread_closed');
  const active = requireActive(actor);
  if (!active.allowed) return active;
  // A block placed after the thread opened freezes it for both sides.
  for (const participantId of thread.participantIds) {
    if (participantId !== actor.id && graph.isBlockedBetween(actor.id, participantId)) {
      return deny('blocked');
    }
  }
  return ALLOW;
}

/**
 * The single gate the UI asks before showing any "reach this person" control.
 * With no live signal context the answer is no — that is the whole point.
 */
export function canContact(
  viewer: ActorView,
  subject: ActorView,
  graph: SafetyGraph,
  context: { readonly openThreadId: string | null; readonly respondableSignal: Signal | null },
  now: Instant,
): Decision {
  if (viewer.id === subject.id) return deny('self');
  if (graph.isBlockedBetween(viewer.id, subject.id)) return deny('blocked');
  if (context.openThreadId !== null) return ALLOW;
  if (context.respondableSignal === null) return deny('no_signal_context');
  return canRespondToSignal(viewer, context.respondableSignal, subject, graph, now);
}

// ---------------------------------------------------------------------------
// Host controls
// ---------------------------------------------------------------------------

export type HostPower =
  | 'accept_response'
  | 'decline_response'
  | 'remove_participant'
  | 'exclude_participant'
  | 'close_participation'
  | 'close_thread';

/**
 * INV-HOST-2. These powers exist only over the object the person hosts. There
 * is no code path that widens them to the platform.
 */
export function canExerciseHostPower(actor: ActorView, signal: Signal, _power: HostPower): Decision {
  if (signal.creatorId !== actor.id) return deny('not_host');
  if (signal.state === 'removed') return deny('content_removed');
  const active = requireActive(actor);
  if (!active.allowed) return active;
  return ALLOW;
}

export function canHost(actor: ActorView): Decision {
  return all(requireActive(actor), requireCapability(actor, 'host'));
}

/** A participant list is projected per viewer, with blocked accounts removed. */
export function visibleParticipants(
  viewer: ActorView,
  participantIds: readonly UserId[],
  graph: SafetyGraph,
): readonly UserId[] {
  return participantIds.filter(
    (id) => id === viewer.id || !graph.isBlockedBetween(viewer.id, id),
  );
}
