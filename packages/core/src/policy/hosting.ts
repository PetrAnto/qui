import type { HostOffer, Instant, Signal } from '../types';
import { canReadSignal } from './access';
import { canPublishInGeo, type EvidenceBundle } from './capabilities';
import { deny, requireActive, type ActorView, type Decision } from './decision';
import type { SafetyGraph } from './graph';
import { canHost, isSignalLive } from './interaction';

/**
 * Designating a host for an activity proposal (ADR-0016, owner decision P1).
 *
 * INV-HOST-3: a host is designated only when **both** people act:
 *  - the prospective host explicitly volunteers (`canVolunteerToHost`), and
 *  - the proposer explicitly confirms that same person (`canConfirmHost`).
 * Neither can appoint anybody unilaterally: a proposer cannot name someone
 * who did not volunteer, and a volunteer cannot confirm themselves. Every
 * condition is checked again at confirmation — nothing granted at the offer
 * is trusted later.
 */

/**
 * Whether this person may offer to host this proposal right now. Hosting keeps
 * its existing requirements: an active account with the `host` capability (an
 * adult with a local tie somewhere) and a local tie to the proposal's own city
 * — the same rule a hosted Join or Event is created under. An exploring or
 * visiting tie never qualifies.
 */
export function canVolunteerToHost(
  volunteer: ActorView,
  signal: Signal,
  proposer: ActorView,
  volunteerEvidence: EvidenceBundle,
  graph: SafetyGraph,
  now: Instant,
): Decision {
  // Only a hostless proposal can be offered a host. Hosted signals, including
  // every Join or Event created as before, are unaffected.
  if (signal.plan === null) return deny('wrong_signal_type');
  if (signal.hostId !== null) return deny('already_hosted');
  // Proposing is not hosting (ADR-0016): the proposer does not host their own.
  if (volunteer.id === proposer.id) return deny('self');
  // Visibility first: removed content, blocks, a suspended proposer, audiences.
  const readable = canReadSignal(volunteer, signal, proposer, graph);
  if (!readable.allowed) return readable;
  if (!isSignalLive(signal, now)) return deny('signal_not_open');
  const hosting = canHost(volunteer);
  if (!hosting.allowed) return hosting;
  return canPublishInGeo(volunteer, signal.geoScopeId, volunteerEvidence);
}

/** Whether the proposer may confirm this volunteer as host — revalidated in full. */
export function canConfirmHost(
  proposer: ActorView,
  signal: Signal,
  volunteer: ActorView,
  volunteerEvidence: EvidenceBundle,
  offer: HostOffer | null,
  graph: SafetyGraph,
  now: Instant,
): Decision {
  if (proposer.id !== signal.creatorId) return deny('not_proposer');
  const active = requireActive(proposer);
  if (!active.allowed) return active;
  if (
    offer === null ||
    offer.state !== 'pending' ||
    offer.signalId !== signal.id ||
    offer.volunteerId !== volunteer.id
  ) {
    return deny('no_host_offer');
  }
  return canVolunteerToHost(volunteer, signal, proposer, volunteerEvidence, graph, now);
}
