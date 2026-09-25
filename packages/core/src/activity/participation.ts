import type { UserId } from '../types';
import { covers, minutesOf, overlapOf, type AvailabilityDeclaration, type Interval } from './interval';

/**
 * Who is actually doing the activity.
 *
 * The organizer is named separately because organizing and taking part are
 * different things: someone can set up a paddle outing for friends without
 * getting on a board. `organizerParticipates` is `null` when nobody recorded
 * it — which is the case for every signal created before this model existed.
 */
export interface Participation {
  readonly organizerId: UserId;
  readonly organizerParticipates: boolean | null;
  /** Accounts holding a 'joined' participant row. */
  readonly participantIds: readonly UserId[];
}

/**
 * What a capacity number counts.
 *
 * Existing signals: the host never holds a participant row on their own signal
 * (`canRespondToSignal` refuses 'self'), and `capacity` has always been
 * compared with the number of joined rows. So historical capacity means
 * "places for people other than the organizer" — `excludes_organizer`. That
 * meaning is preserved, not reinterpreted. `includes_organizer` is for models
 * that record the organizer's own participation explicitly.
 */
export type CapacityCounts = 'excludes_organizer' | 'includes_organizer';

export interface Capacity {
  /** null = no limit was set. */
  readonly places: number | null;
  readonly counts: CapacityCounts;
}

export interface ActiveParticipants {
  /** Each person once, organizer included only when they take part. */
  readonly ids: readonly UserId[];
  /** False when the organizer's own participation is not recorded. */
  readonly complete: boolean;
}

export function activeParticipants(participation: Participation): ActiveParticipants {
  const ids = new Set(participation.participantIds);
  if (participation.organizerParticipates === true) ids.add(participation.organizerId);
  if (participation.organizerParticipates === false) ids.delete(participation.organizerId);
  return {
    ids: [...ids].sort(),
    complete: participation.organizerParticipates !== null,
  };
}

/** Places still free, or null when the activity has no limit. */
export function remainingPlaces(capacity: Capacity, participation: Participation): number | null {
  if (capacity.places === null) return null;
  const others = new Set(participation.participantIds);
  others.delete(participation.organizerId);
  const taken =
    capacity.counts === 'excludes_organizer'
      ? others.size
      : others.size + (participation.organizerParticipates === true ? 1 : 0);
  return Math.max(0, capacity.places - taken);
}

/**
 * What a person's declaration says about one target time.
 *
 * - `appointment`: a fixed time. Available only if one declared interval
 *   contains the *whole* appointment — being free for the first half of a
 *   padel slot is not being free for it.
 * - `window`: a still-open window. Available if some declared interval
 *   overlaps it for at least `minMinutes`.
 */
export type AvailabilityTarget =
  | { readonly kind: 'appointment'; readonly interval: Interval }
  | { readonly kind: 'window'; readonly interval: Interval; readonly minMinutes: number };

export type ParticipantAvailability = 'available' | 'unavailable' | 'not_declared';

export interface ParticipantAvailabilityRow {
  readonly userId: UserId;
  readonly status: ParticipantAvailability;
}

export function availabilityFor(
  target: AvailabilityTarget,
  participantIds: readonly UserId[],
  declarations: readonly AvailabilityDeclaration[],
): readonly ParticipantAvailabilityRow[] {
  return [...new Set(participantIds)].sort().map((userId) => {
    const declaration = declarations.find((entry) => entry.userId === userId);
    if (declaration === undefined || declaration.intervals.length === 0) {
      return { userId, status: 'not_declared' as const };
    }
    const fits = declaration.intervals.some((interval) => {
      if (target.kind === 'appointment') return covers(interval, target.interval);
      const shared = overlapOf(interval, target.interval);
      return shared !== null && minutesOf(shared) >= target.minMinutes;
    });
    return { userId, status: fits ? ('available' as const) : ('unavailable' as const) };
  });
}
