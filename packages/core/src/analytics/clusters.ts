import type { GeoScopeId, SignalType } from '../types';
import type { AnalyticsEvent, AnalyticsEventName } from './events';

/**
 * Cluster analytics: which (city), (city × practice) and (city × signal type)
 * cells are actually coming alive.
 *
 * The activation score weights *conversion* events far above impressions,
 * because the product thesis is "attention becomes real-world interaction". A
 * city with a lot of scrolling and no threads should score badly, and does.
 */
export const ACTIVATION_WEIGHTS: Readonly<Partial<Record<AnalyticsEventName, number>>> = Object.freeze({
  discover_impression: 0.05,
  content_open: 0.2,
  profile_open: 0.4,
  appreciation_created: 0.6,
  signal_created: 3,
  signal_response: 4,
  thread_started: 6,
  message_sent: 1,
  participant_joined: 5,
  invite_accepted: 4,
  local_outcome_recorded: 12,
});

export interface ClusterMetrics {
  readonly activeUsers: number;
  readonly creators: number;
  readonly posts: number;
  readonly contentOpens: number;
  readonly profileOpens: number;
  readonly appreciations: number;
  readonly signalsCreated: number;
  readonly signalResponses: number;
  readonly threadsStarted: number;
  readonly participantsJoined: number;
  readonly invitesAccepted: number;
  readonly returningUsers: number;
  readonly localOutcomes: number;
  readonly activationScore: number;
}

export interface ClusterRow extends ClusterMetrics {
  readonly geoScopeId: GeoScopeId;
  readonly key: string;
  readonly dimension: 'city' | 'city_practice' | 'city_signal_type';
  readonly practice: string | null;
  readonly signalType: SignalType | null;
}

interface Accumulator {
  readonly geoScopeId: GeoScopeId;
  readonly dimension: ClusterRow['dimension'];
  readonly practice: string | null;
  readonly signalType: SignalType | null;
  readonly actors: Set<string>;
  readonly creators: Set<string>;
  readonly actorDays: Set<string>;
  counts: Map<AnalyticsEventName, number>;
  score: number;
}

function bump(accumulator: Accumulator, event: AnalyticsEvent): void {
  accumulator.counts.set(event.name, (accumulator.counts.get(event.name) ?? 0) + 1);
  accumulator.score += ACTIVATION_WEIGHTS[event.name] ?? 0;
  if (event.actorId !== null) {
    accumulator.actors.add(event.actorId);
    accumulator.actorDays.add(`${event.actorId}::${event.at.slice(0, 10)}`);
    if (event.name === 'signal_created' || event.name === 'appreciation_created') {
      accumulator.creators.add(event.actorId);
    }
  }
}

function count(accumulator: Accumulator, name: AnalyticsEventName): number {
  return accumulator.counts.get(name) ?? 0;
}

function finalize(accumulator: Accumulator, postsByScope: ReadonlyMap<GeoScopeId, number>): ClusterRow {
  // A "returning" actor is one seen on more than one calendar day.
  const daysByActor = new Map<string, number>();
  for (const entry of accumulator.actorDays) {
    const actor = entry.split('::')[0] ?? '';
    daysByActor.set(actor, (daysByActor.get(actor) ?? 0) + 1);
  }
  const returningUsers = [...daysByActor.values()].filter((days) => days > 1).length;

  return {
    geoScopeId: accumulator.geoScopeId,
    dimension: accumulator.dimension,
    practice: accumulator.practice,
    signalType: accumulator.signalType,
    key: [accumulator.geoScopeId, accumulator.practice ?? '', accumulator.signalType ?? ''].join('|'),
    activeUsers: accumulator.actors.size,
    creators: accumulator.creators.size,
    posts: accumulator.dimension === 'city' ? (postsByScope.get(accumulator.geoScopeId) ?? 0) : 0,
    contentOpens: count(accumulator, 'content_open'),
    profileOpens: count(accumulator, 'profile_open'),
    appreciations: count(accumulator, 'appreciation_created'),
    signalsCreated: count(accumulator, 'signal_created'),
    signalResponses: count(accumulator, 'signal_response'),
    threadsStarted: count(accumulator, 'thread_started'),
    participantsJoined: count(accumulator, 'participant_joined'),
    invitesAccepted: count(accumulator, 'invite_accepted'),
    returningUsers,
    localOutcomes: count(accumulator, 'local_outcome_recorded'),
    activationScore: Math.round(accumulator.score * 100) / 100,
  };
}

export interface ClusterReport {
  readonly cities: readonly ClusterRow[];
  readonly cityPractices: readonly ClusterRow[];
  readonly citySignalTypes: readonly ClusterRow[];
}

export function buildClusterReport(
  events: readonly AnalyticsEvent[],
  postsByScope: ReadonlyMap<GeoScopeId, number> = new Map(),
): ClusterReport {
  const accumulators = new Map<string, Accumulator>();

  const ensure = (
    dimension: ClusterRow['dimension'],
    geoScopeId: GeoScopeId,
    practice: string | null,
    signalType: SignalType | null,
  ): Accumulator => {
    const key = `${dimension}|${geoScopeId}|${practice ?? ''}|${signalType ?? ''}`;
    let accumulator = accumulators.get(key);
    if (!accumulator) {
      accumulator = {
        geoScopeId,
        dimension,
        practice,
        signalType,
        actors: new Set<string>(),
        creators: new Set<string>(),
        actorDays: new Set<string>(),
        counts: new Map<AnalyticsEventName, number>(),
        score: 0,
      };
      accumulators.set(key, accumulator);
    }
    return accumulator;
  };

  for (const event of events) {
    if (event.geoScopeId === null) continue;
    bump(ensure('city', event.geoScopeId, null, null), event);
    if (event.practice !== null) {
      bump(ensure('city_practice', event.geoScopeId, event.practice, null), event);
    }
    if (event.signalType !== null) {
      bump(ensure('city_signal_type', event.geoScopeId, null, event.signalType), event);
    }
  }

  const rows = [...accumulators.values()].map((accumulator) => finalize(accumulator, postsByScope));
  const byScore = (a: ClusterRow, b: ClusterRow): number =>
    b.activationScore !== a.activationScore
      ? b.activationScore - a.activationScore
      : a.key < b.key
        ? -1
        : 1;

  return {
    cities: rows.filter((row) => row.dimension === 'city').sort(byScore),
    cityPractices: rows.filter((row) => row.dimension === 'city_practice').sort(byScore),
    citySignalTypes: rows.filter((row) => row.dimension === 'city_signal_type').sort(byScore),
  };
}
