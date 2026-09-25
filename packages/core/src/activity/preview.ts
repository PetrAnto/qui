import { formatInterval, type AvailabilityInterval } from './interval';
import type { Level, Wish } from './match';
import { normalizePracticeKey } from './match';

/**
 * The proposal a search would become, shown before anything is published.
 *
 * Built only from what the person typed and picked — the same inputs the
 * search used — so an empty city still yields a ready proposal. It is a
 * preview: nothing in this module publishes, joins or writes, and
 * `publishable` is false because proposing without hosting awaits an owner
 * decision (docs/ACTIVITY_PROPOSALS.md, P5).
 */
export interface ProposalPreviewInput {
  readonly practice: string;
  readonly cityName: string;
  readonly timezone: string;
  readonly availability: readonly AvailabilityInterval[];
  readonly durationMinutes: number;
  readonly level?: Wish<Level>;
  readonly freeOnly?: Wish<true>;
}

export interface PreviewCriterion {
  readonly label: string;
  readonly mandatory: boolean;
}

export interface ProposalPreview {
  readonly title: string;
  readonly practiceKey: string;
  readonly cityName: string;
  readonly timezone: string;
  readonly windows: readonly { readonly label: string; readonly preferred: boolean }[];
  readonly durationMinutes: number;
  readonly criteria: readonly PreviewCriterion[];
  /** Always "none yet": an ordinary activity never gets an equipment form. */
  readonly equipment: 'none';
  readonly cost: 'free' | 'not_stated';
  readonly publishable: false;
  readonly notPublishableBecause: 'owner_decision_pending';
}

export function buildProposalPreview(input: ProposalPreviewInput): ProposalPreview {
  const practice = input.practice.trim();
  const criteria: PreviewCriterion[] = [];
  if (input.level !== undefined && input.level.value !== 'any') {
    criteria.push({ label: `Level: ${input.level.value}`, mandatory: input.level.mandatory });
  }
  if (input.freeOnly !== undefined) {
    criteria.push({ label: 'Free to take part', mandatory: input.freeOnly.mandatory });
  }
  const windows = [...input.availability]
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    .map((interval) => ({ label: formatInterval(interval, input.timezone), preferred: interval.preferred === true }));
  return {
    title: `${practice} in ${input.cityName}`,
    practiceKey: normalizePracticeKey(practice),
    cityName: input.cityName,
    timezone: input.timezone,
    windows,
    durationMinutes: input.durationMinutes,
    criteria,
    equipment: 'none',
    cost: input.freeOnly !== undefined ? 'free' : 'not_stated',
    publishable: false,
    notPublishableBecause: 'owner_decision_pending',
  };
}
