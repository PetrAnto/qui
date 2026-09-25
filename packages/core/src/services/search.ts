import { describeSignal } from '../activity/describe';
import { isValidTimeZone } from '../activity/interval';
import {
  matchActivities,
  normalizePracticeKey,
  type ActivityDescriptor,
  type ActivityMatch,
  type ActivityQuery,
  type Level,
  type Wish,
} from '../activity/match';
import { DAY_PARTS, isLocalDate, slotsToAvailability, type DaySlot } from '../activity/search-input';
import type { Ports } from '../repository';
import type { GeoScopeId, UserId } from '../types';
import { fail, ok, type ServiceResult } from './context';
import { listSignals, type SignalCard } from './read';

/**
 * Activity search: "I want to do X, in this city, at these times".
 *
 * Read-only by construction. It publishes nothing, joins nothing, and records
 * nothing — there is no analytics event for a search (INV-ANALYTICS-1 is a
 * closed vocabulary) and no write of any kind.
 *
 * Visibility is not re-derived here. Candidates are exactly the signals the
 * Signals list already shows this viewer (`listSignals`: removed content,
 * blocked pairs and adult-only audiences are gone before anything is matched),
 * so search and the list cannot drift apart. Matching then only reorders and
 * explains what the viewer was already allowed to see (ADR-0008). Whether the
 * viewer may join stays the list's own `eligibility`, computed by policy.
 */

export const MAX_SEARCH_SLOTS = 21;
export const MAX_PRACTICE_LENGTH = 40;
const LEVELS: readonly Level[] = ['any', 'beginner', 'intermediate', 'advanced'];

export interface ActivitySearchInput {
  readonly practice: string;
  readonly geoScopeId: GeoScopeId;
  readonly slots: readonly DaySlot[];
  /** How long the person wants to spend, in minutes. */
  readonly durationMinutes: number;
  readonly level?: Wish<Level>;
  readonly freeOnly?: Wish<true>;
}

export interface ActivitySearchResult {
  /** The signal as the Signals list projects it for this viewer. */
  readonly card: SignalCard;
  readonly match: ActivityMatch;
}

export interface ActivitySearchView {
  readonly timezone: string;
  /** Compatible first, then those that need confirmation; see `matchActivities`. */
  readonly results: readonly ActivitySearchResult[];
  /** Visible, open activities that were checked and do not fit. */
  readonly notCompatible: number;
}

export function isValidSearchInput(input: ActivitySearchInput): boolean {
  const practice = input.practice.trim();
  if (practice.length === 0 || practice.length > MAX_PRACTICE_LENGTH) return false;
  if (normalizePracticeKey(practice) === '') return false;
  if (input.slots.length === 0 || input.slots.length > MAX_SEARCH_SLOTS) return false;
  if (!input.slots.every((slot) => isLocalDate(slot.date) && (DAY_PARTS as readonly string[]).includes(slot.part))) {
    return false;
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 30 || input.durationMinutes > 480) {
    return false;
  }
  if (input.level !== undefined && !LEVELS.includes(input.level.value)) return false;
  return true;
}

export async function searchActivities(
  ports: Ports,
  request: { readonly viewerId: UserId; readonly input: ActivitySearchInput },
): Promise<ServiceResult<ActivitySearchView>> {
  const { input } = request;
  if (!isValidSearchInput(input)) return fail('invalid_input');
  const scope = await ports.repo.getGeoScope(input.geoScopeId);
  if (scope === null || scope.kind !== 'city') return fail('not_found');
  if (scope.timezone === null || !isValidTimeZone(scope.timezone)) return fail('invalid_input');
  const timezone = scope.timezone;

  const cards = await listSignals(ports, { viewerId: request.viewerId, geoScopeId: scope.id });
  if (cards === null) return fail('not_found');
  const groupCards = cards.filter((card) => card.signal.type === 'join' || card.signal.type === 'event');

  const now = ports.now();
  const participants = await ports.repo.listParticipants();
  const descriptors: ActivityDescriptor[] = [];
  for (const card of groupCards) {
    const signal = await ports.repo.getSignal(card.signal.id);
    if (signal === null) continue;
    const descriptor = describeSignal(signal, {
      joinedIds: participants
        .filter((entry) => entry.signalId === signal.id && entry.state === 'joined')
        .map((entry) => entry.userId),
      timezone,
      now,
    });
    // Closed and expired activities are not offered to somebody looking for
    // something to do; they are still on the Signals list as history.
    if (descriptor !== null && descriptor.live) descriptors.push(descriptor);
  }

  const query: ActivityQuery = {
    practiceKey: input.practice,
    geoScopeId: scope.id,
    timezone,
    availability: slotsToAvailability(input.slots, timezone),
    minimumMinutes: input.durationMinutes,
    ...(input.level !== undefined ? { level: input.level } : {}),
    ...(input.freeOnly !== undefined
      ? { costType: { value: 'free_only' as const, mandatory: input.freeOnly.mandatory } }
      : {}),
  };

  const byId = new Map(groupCards.map((card) => [card.signal.id, card]));
  const matches = matchActivities(query, descriptors, now);
  const results: ActivitySearchResult[] = [];
  let notCompatible = 0;
  for (const match of matches) {
    const card = byId.get(match.signalId);
    if (card === undefined) continue;
    if (match.verdict === 'incompatible') {
      notCompatible += 1;
      continue;
    }
    results.push({ card, match });
  }
  return ok({ timezone, results, notCompatible });
}
