import { isSignalLive } from '../policy/interaction';
import type { Instant, Signal, UserId } from '../types';
import type { ActivityDescriptor } from './match';
import { normalizePracticeKey } from './match';

/**
 * An existing Join or Event signal, described for matching without inventing
 * anything it does not say.
 *
 * Existing signals carry a start time but no end, no level, no cost and no
 * equipment, and they never recorded whether the host takes part. Those stay
 * unknown, so such a signal can come back as `unconfirmed` — it is never
 * silently dropped for lacking a plan, and never claimed to satisfy a
 * criterion it cannot speak to. Capacity keeps its historical meaning: places
 * for people other than the host.
 */
/** A practice that normalises to nothing is no practice at all: unknown, not "". */
function practiceKeyOf(practice: string | null): string | null {
  if (practice === null) return null;
  const key = normalizePracticeKey(practice);
  return key === '' ? null : key;
}

export function describeSignal(
  signal: Signal,
  context: {
    readonly joinedIds: readonly UserId[];
    /** The zone of the signal's place (GeoScope.timezone); null if unknown. */
    readonly timezone: string | null;
    readonly now: Instant;
  },
): ActivityDescriptor | null {
  if (signal.type !== 'join' && signal.type !== 'event') return null;
  if (signal.state === 'removed') return null;
  const plan = signal.plan;
  if (plan !== null) {
    // An activity proposal (ADR-0016): its windows stay candidate windows,
    // only a *required* level is a stated fact about it, and cost stays
    // unknown. The proposer is not a participant and holds no place.
    return {
      signalId: signal.id,
      geoScopeId: signal.geoScopeId,
      timezone: plan.timezone,
      live: isSignalLive(signal, context.now),
      practiceKey: practiceKeyOf(signal.practice),
      timing: {
        kind: 'proposed',
        windows: plan.windows.map((window) => ({ start: window.start, end: window.end })),
        durationMinutes: plan.durationMinutes,
      },
      capacity: { places: signal.capacity, counts: 'includes_organizer' },
      participation: {
        organizerId: signal.creatorId,
        organizerParticipates: false,
        participantIds: context.joinedIds,
      },
      cost: { kind: 'unknown' },
      level: plan.level !== null && plan.level.mandatory ? plan.level.value : null,
      equipment: null,
    };
  }
  return {
    signalId: signal.id,
    geoScopeId: signal.geoScopeId,
    timezone: context.timezone,
    live: isSignalLive(signal, context.now),
    practiceKey: practiceKeyOf(signal.practice),
    timing: signal.startsAt === null ? { kind: 'unknown' } : { kind: 'start_only', start: signal.startsAt },
    capacity: { places: signal.capacity, counts: 'excludes_organizer' },
    participation: {
      organizerId: signal.creatorId,
      organizerParticipates: null,
      participantIds: context.joinedIds,
    },
    cost: { kind: 'unknown' },
    level: null,
    equipment: null,
  };
}
