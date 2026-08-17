import type { GeoScopeId, Instant, SignalType, UserId } from '../types';

/**
 * Product analytics.
 *
 * The question this instrumentation exists to answer is "where is this starting
 * to work", not "how long did people stare at it". Time-spent is deliberately
 * not collected.
 *
 * The event shape is closed (INV-ANALYTICS-1): there is no free-form payload,
 * so a coordinate, an email or a document field has nowhere to land.
 */
export const ANALYTICS_EVENT_NAMES = [
  'city_added',
  'city_removed',
  'city_switched',
  'discover_impression',
  'content_open',
  'profile_open',
  'appreciation_created',
  'signal_open',
  'signal_created',
  'signal_response',
  'thread_started',
  'message_sent',
  'participant_joined',
  'participant_removed',
  'block_created',
  'report_created',
  'invite_created',
  'invite_accepted',
  'vouch_created',
  'local_outcome_recorded',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export interface AnalyticsEvent {
  readonly id: string;
  readonly name: AnalyticsEventName;
  readonly at: Instant;
  readonly actorId: UserId | null;
  readonly geoScopeId: GeoScopeId | null;
  readonly practice: string | null;
  readonly signalType: SignalType | null;
  /** Id of the content/signal/thread involved. Never a coordinate or a name. */
  readonly targetId: string | null;
}

export interface AnalyticsInput {
  readonly name: AnalyticsEventName;
  readonly at: Instant;
  readonly actorId?: UserId | null;
  readonly geoScopeId?: GeoScopeId | null;
  readonly practice?: string | null;
  readonly signalType?: SignalType | null;
  readonly targetId?: string | null;
}

export function buildAnalyticsEvent(id: string, input: AnalyticsInput): AnalyticsEvent {
  return {
    id,
    name: input.name,
    at: input.at,
    actorId: input.actorId ?? null,
    geoScopeId: input.geoScopeId ?? null,
    practice: input.practice ?? null,
    signalType: input.signalType ?? null,
    targetId: input.targetId ?? null,
  };
}
