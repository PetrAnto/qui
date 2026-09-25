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
  return {
    signalId: signal.id,
    geoScopeId: signal.geoScopeId,
    timezone: context.timezone,
    live: isSignalLive(signal, context.now),
    practiceKey: signal.practice === null ? null : normalizePracticeKey(signal.practice),
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
