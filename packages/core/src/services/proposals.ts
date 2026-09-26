import { buildProposalPreview } from '../activity/preview';
import { slotsToAvailability } from '../activity/search-input';
import { isValidTimeZone, toMs } from '../activity/interval';
import { canProposeActivity } from '../policy/capabilities';
import type { Ports } from '../repository';
import type { ActivityPlan, Signal, SignalId, UserId } from '../types';
import { audit, fail, loadActor, ok, track, type ServiceResult } from './context';
import { isValidSearchInput, type ActivitySearchInput } from './search';

/**
 * Publishing the proposal an activity search became (ADR-0016).
 *
 * One explicit request turns the same inputs the search and the preview used
 * into one `join` Signal. There is no separate "request" to convert later.
 * The signal is *hostless*: its proposer gets no host power and no place in
 * it, and nobody can join or answer it until a host exists (INV-PROPOSAL-1).
 *
 * Everything is checked before the first write — input, city, and the
 * proposer's eligibility (`canProposeActivity`: active adult, `publish`, an
 * existing attachment to the city, which is never created here). A refusal
 * writes nothing.
 *
 * Idempotent: the signal id is derived from the proposer and a key the client
 * keeps for the draft, so a retry or a double click lands on the same activity
 * instead of creating a second one.
 */

export const PROPOSAL_KEY = /^[a-z0-9][a-z0-9-]{7,63}$/;

export interface PublishProposalResult {
  readonly signalId: SignalId;
  /** False when the same key had already published this proposal. */
  readonly created: boolean;
}

export function proposalSignalId(proposerId: UserId, proposalKey: string): SignalId {
  return `sig-p-${proposerId}-${proposalKey}`;
}

export async function publishProposal(
  ports: Ports,
  request: { readonly actorId: UserId; readonly input: ActivitySearchInput; readonly proposalKey: string },
): Promise<ServiceResult<PublishProposalResult>> {
  const { input, proposalKey } = request;
  if (!PROPOSAL_KEY.test(proposalKey) || !isValidSearchInput(input)) return fail('invalid_input');

  const scope = await ports.repo.getGeoScope(input.geoScopeId);
  if (scope === null || scope.kind !== 'city') return fail('not_found');
  if (scope.timezone === null || !isValidTimeZone(scope.timezone)) return fail('invalid_input');

  const actor = await loadActor(ports, request.actorId);
  if (actor === null) return fail('not_found');
  const eligible = canProposeActivity(actor.view, scope.id, actor.evidence);
  if (!eligible.allowed) return fail(eligible.reason);

  const now = ports.now();
  const windows = slotsToAvailability(input.slots, scope.timezone).map((interval) => ({
    start: interval.start,
    end: interval.end,
    preferred: interval.preferred === true,
  }));
  // A proposal must still be possible: at least one window has to end in the future.
  const lastEnd = Math.max(...windows.map((window) => toMs(window.end)));
  if (!(lastEnd > toMs(now))) return fail('invalid_input');

  const practiceLabel = input.practice.trim();
  const plan: ActivityPlan = {
    practiceLabel,
    timezone: scope.timezone,
    windows,
    durationMinutes: input.durationMinutes,
    level: input.level === undefined ? null : { value: input.level.value, mandatory: input.level.mandatory },
    freeOnly: input.freeOnly === undefined ? null : { mandatory: input.freeOnly.mandatory },
    proposalKey,
  };

  const id = proposalSignalId(request.actorId, proposalKey);
  const existing = await ports.repo.getSignal(id);
  if (existing !== null) {
    // Same proposer, same key, same proposal: the retry of a publication that
    // already happened. A reused key carrying different inputs, or somebody
    // else's signal, is a conflict — never a silent overwrite.
    const same =
      existing.creatorId === request.actorId &&
      existing.geoScopeId === scope.id &&
      existing.plan !== null &&
      JSON.stringify(existing.plan) === JSON.stringify(plan);
    return same ? ok({ signalId: id, created: false }) : fail('conflict');
  }

  const preview = buildProposalPreview({
    practice: practiceLabel,
    cityName: scope.name,
    timezone: scope.timezone,
    availability: windows,
    durationMinutes: input.durationMinutes,
  });

  const signal: Signal = {
    id,
    creatorId: request.actorId,
    hostId: null,
    plan,
    type: 'join',
    title: preview.title,
    body: '',
    geoScopeId: scope.id,
    practice: practiceLabel,
    linkedPostId: null,
    placeLabel: null,
    // Windows are candidate times, never an appointment.
    startsAt: null,
    expiresAt: new Date(lastEnd).toISOString(),
    capacity: null,
    audience: 'all',
    state: 'open',
    createdAt: now,
    demo: true,
  };
  await ports.repo.putSignal(signal);
  await track(ports, {
    name: 'signal_created',
    actorId: request.actorId,
    geoScopeId: scope.id,
    practice: practiceLabel,
    signalType: 'join',
    targetId: id,
  });
  await audit(ports, {
    actorId: request.actorId,
    action: 'proposal_published',
    subjectType: 'signal',
    subjectId: id,
  });
  return ok({ signalId: id, created: true });
}
