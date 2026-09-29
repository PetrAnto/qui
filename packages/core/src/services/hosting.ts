import { canConfirmHost, canVolunteerToHost } from '../policy/hosting';
import type { Ports } from '../repository';
import type { SignalId, UserId } from '../types';
import { audit, fail, loadActor, loadSafetyGraph, ok, type ServiceResult } from './context';

/**
 * Designating the host of an activity proposal (ADR-0016, P1; INV-HOST-3).
 *
 * Two explicit acts by two people, in this order:
 *  1. `volunteerToHost` — an eligible adult with a local tie to the city
 *     offers. Nothing changes on the activity; only an offer is recorded.
 *  2. `confirmHost` — the proposer confirms that volunteer. Everything is
 *     revalidated at that moment (both accounts, blocks, capability, local
 *     tie, lifecycle, the offer itself), then the host is installed with an
 *     atomic compare-and-set, so concurrent confirmations cannot install two
 *     different hosts.
 *
 * The activity keeps its id, plan, candidate windows and criteria. No
 * appointment is fixed and nobody is joined: from then on the existing hosted
 * Join rules apply, with the designated host holding the host powers and the
 * proposer holding none.
 */

export async function volunteerToHost(
  ports: Ports,
  input: { readonly actorId: UserId; readonly signalId: SignalId },
): Promise<ServiceResult<{ readonly offered: boolean }>> {
  const [volunteer, signal, graph] = await Promise.all([
    loadActor(ports, input.actorId),
    ports.repo.getSignal(input.signalId),
    loadSafetyGraph(ports),
  ]);
  if (volunteer === null || signal === null) return fail('not_found');
  const proposer = await loadActor(ports, signal.creatorId);
  if (proposer === null) return fail('not_found');

  const decision = canVolunteerToHost(volunteer.view, signal, proposer.view, volunteer.evidence, graph, ports.now());
  if (!decision.allowed) return fail(decision.reason);

  const offers = await ports.repo.listHostOffers(signal.id);
  if (offers.some((offer) => offer.volunteerId === input.actorId && offer.state === 'pending')) {
    return ok({ offered: false });
  }
  await ports.repo.putHostOffer({
    signalId: signal.id,
    volunteerId: input.actorId,
    state: 'pending',
    createdAt: ports.now(),
  });
  await audit(ports, {
    actorId: input.actorId,
    action: 'host_offered',
    subjectType: 'signal',
    subjectId: signal.id,
  });
  return ok({ offered: true });
}

export async function confirmHost(
  ports: Ports,
  input: { readonly proposerId: UserId; readonly signalId: SignalId; readonly volunteerId: UserId },
): Promise<ServiceResult<{ readonly hostId: UserId; readonly designated: boolean }>> {
  const [proposer, volunteer, signal, graph] = await Promise.all([
    loadActor(ports, input.proposerId),
    loadActor(ports, input.volunteerId),
    ports.repo.getSignal(input.signalId),
    loadSafetyGraph(ports),
  ]);
  if (proposer === null || volunteer === null || signal === null) return fail('not_found');

  // Confirming the host already in place is a retry, not a second designation.
  if (signal.hostId !== null && signal.plan !== null && signal.creatorId === input.proposerId) {
    return signal.hostId === input.volunteerId
      ? ok({ hostId: signal.hostId, designated: false })
      : fail('already_hosted');
  }

  const offers = await ports.repo.listHostOffers(signal.id);
  const offer = offers.find((entry) => entry.volunteerId === input.volunteerId) ?? null;
  const decision = canConfirmHost(
    proposer.view,
    signal,
    volunteer.view,
    volunteer.evidence,
    offer,
    graph,
    ports.now(),
  );
  if (!decision.allowed) return fail(decision.reason);

  // Compare-and-set: only a signal that still has no host takes this one.
  const designated = await ports.repo.assignSignalHost(signal.id, input.volunteerId);
  if (!designated) {
    const winner = await ports.repo.getSignal(signal.id);
    return winner?.hostId === input.volunteerId
      ? ok({ hostId: input.volunteerId, designated: false })
      : fail('already_hosted');
  }
  if (offer !== null) await ports.repo.putHostOffer({ ...offer, state: 'accepted' });
  await audit(ports, {
    actorId: input.proposerId,
    action: 'host_designated',
    subjectType: 'signal',
    subjectId: signal.id,
    metadata: { hostId: input.volunteerId },
  });
  return ok({ hostId: input.volunteerId, designated: true });
}
