import type { UserId } from '../types';
import { covers, type Interval } from './interval';

/**
 * Equipment an activity needs, and what people have said they can bring.
 *
 * Optional by construction: an activity with no needs has no equipment state
 * at all, so an ordinary walk never grows an equipment form.
 *
 * Nothing here is a safety statement. A declared board is a person saying
 * they have a board — not a certification that it, or they, are fit for the
 * water. There is deliberately no `verified`, `certified` or `safe` field.
 *
 * The item kind is a closed vocabulary so a coverage summary can be shown to
 * anyone allowed to see the activity without echoing free text written by a
 * participant (which could name somebody).
 */
export const EQUIPMENT_KINDS = [
  'board',
  'paddle',
  'leash',
  'buoyancy_aid',
  'wetsuit',
  'racket',
  'balls',
  'court_reservation',
  'other',
] as const;

export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number];

export interface EquipmentNeed {
  readonly id: string;
  readonly kind: EquipmentKind;
  readonly quantity: number;
  /** 'participant': each person doing the activity needs `quantity`. */
  readonly per: 'participant' | 'activity';
  readonly required: boolean;
}

/**
 * Two independent dimensions.
 *
 * `use` — who the item can serve:
 *   - `own_use`: only its owner (my board, for me);
 *   - `shareable`: anyone in the activity.
 *
 * `status` — how settled it is:
 *   - `suggested`: an option somebody pointed at ("the rental hut on the
 *     beach"). Unresolved; counts for nothing.
 *   - `offered`: a person says they could provide it ("I can book a court",
 *     "I can probably borrow one"). Pending; counts for nothing yet.
 *   - `confirmed`: the person confirms they have it for the stated times
 *     ("board in my car Saturday", "court booked Thu 19:30–21:00"). Only this
 *     counts toward coverage.
 */
export type ContributionUse = 'own_use' | 'shareable';
export type ContributionStatus = 'suggested' | 'offered' | 'confirmed';

export interface EquipmentContribution {
  readonly id: string;
  readonly needId: string;
  readonly contributorId: UserId;
  readonly use: ContributionUse;
  readonly status: ContributionStatus;
  readonly quantity: number;
  /**
   * When the item is available. null = not stated. A confirmed contribution
   * only counts for an interval one of these contains entirely; availability
   * is never stretched to cover a date the person did not name.
   */
  readonly availableDuring: readonly Interval[] | null;
}

export type NeedStatus = 'covered' | 'partial' | 'missing';

export interface NeedCoverage {
  readonly needId: string;
  readonly kind: EquipmentKind;
  readonly required: boolean;
  readonly needed: number;
  readonly covered: number;
  readonly missing: number;
  readonly status: NeedStatus;
  /** Quantity offered but not confirmed for this interval. */
  readonly offered: number;
  /** Number of unresolved suggestions (e.g. a rental option). */
  readonly suggestions: number;
}

export interface EquipmentCoverage {
  readonly interval: Interval;
  readonly needs: readonly NeedCoverage[];
  /** Required units still missing, across all required needs. */
  readonly requiredMissing: number;
  /** Every required need is covered. Optional needs never block this. */
  readonly complete: boolean;
}

export interface CoverageInput {
  readonly interval: Interval;
  readonly needs: readonly EquipmentNeed[];
  readonly contributions: readonly EquipmentContribution[];
  /** The people doing the activity, each once (see `activeParticipants`). */
  readonly participantIds: readonly UserId[];
  /**
   * The organizer may lend shareable items without taking part. Their own-use
   * items create no need and cover nothing unless they are a participant.
   */
  readonly organizerId: UserId;
}

function availableFor(contribution: EquipmentContribution, interval: Interval): boolean {
  return (contribution.availableDuring ?? []).some((window) => covers(window, interval));
}

/**
 * Coverage for one interval — the fixed appointment, or one candidate time.
 * Computed on read and never stored, so a change of date, of who is in, or of
 * what someone offered is reflected the next time it is asked.
 *
 * Each contribution is counted at most once, for the one need it names. An
 * own-use item covers only its owner, and only up to the owner's own need; its
 * surplus is not handed to anyone else.
 */
export function equipmentCoverage(input: CoverageInput): EquipmentCoverage {
  const participants = new Set(input.participantIds);
  const contributors = new Set([...participants, input.organizerId]);

  const seen = new Set<string>();
  const contributions = input.contributions.filter((entry) => {
    if (seen.has(entry.id) || entry.quantity <= 0) return false;
    seen.add(entry.id);
    return contributors.has(entry.contributorId);
  });

  const needs = [...input.needs]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((need): NeedCoverage => {
      const forNeed = contributions.filter((entry) => entry.needId === need.id);
      const confirmed = forNeed.filter(
        (entry) => entry.status === 'confirmed' && availableFor(entry, input.interval),
      );
      const shareable = confirmed
        .filter((entry) => entry.use === 'shareable')
        .reduce((sum, entry) => sum + entry.quantity, 0);

      let needed: number;
      let covered: number;
      if (need.per === 'participant') {
        needed = need.quantity * participants.size;
        let ownCovered = 0;
        for (const participantId of participants) {
          const own = confirmed
            .filter((entry) => entry.use === 'own_use' && entry.contributorId === participantId)
            .reduce((sum, entry) => sum + entry.quantity, 0);
          ownCovered += Math.min(need.quantity, own);
        }
        covered = ownCovered + Math.min(shareable, needed - ownCovered);
      } else {
        // A shared requirement (a court, a set of balls) is met by what is
        // made available to the group, not by someone's personal kit.
        needed = need.quantity;
        covered = Math.min(shareable, needed);
      }

      const offered = forNeed
        .filter(
          (entry) =>
            entry.status === 'offered' &&
            (entry.availableDuring === null || availableFor(entry, input.interval)),
        )
        .reduce((sum, entry) => sum + entry.quantity, 0);
      const suggestions = forNeed.filter((entry) => entry.status === 'suggested').length;
      const missing = needed - covered;

      return {
        needId: need.id,
        kind: need.kind,
        required: need.required,
        needed,
        covered,
        missing,
        status: missing === 0 ? 'covered' : covered > 0 ? 'partial' : 'missing',
        offered,
        suggestions,
      };
    });

  const requiredMissing = needs
    .filter((need) => need.required)
    .reduce((sum, need) => sum + need.missing, 0);

  return { interval: input.interval, needs, requiredMissing, complete: requiredMissing === 0 };
}
