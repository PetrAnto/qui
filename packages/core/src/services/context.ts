import { buildAnalyticsEvent, type AnalyticsInput } from '../analytics/events';
import { toActorView, type EvidenceBundle } from '../policy/capabilities';
import type { ActorView, PolicyReason } from '../policy/decision';
import { createSafetyGraph, type SafetyGraph } from '../policy/graph';
import type { Ports } from '../repository';
import type { Person, UserId } from '../types';

export type Failure = PolicyReason | 'not_found' | 'invalid_input' | 'conflict';

export type ServiceResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: Failure };

export function ok<T>(value: T): ServiceResult<T> {
  return { ok: true, value };
}

export function fail<T>(reason: Failure): ServiceResult<T> {
  return { ok: false, reason };
}

export interface LoadedActor {
  readonly person: Person;
  readonly view: ActorView;
  readonly evidence: EvidenceBundle;
}

export async function loadActor(ports: Ports, userId: UserId): Promise<LoadedActor | null> {
  const person = await ports.repo.getPerson(userId);
  if (person === null) return null;
  const evidence = await ports.repo.evidenceFor(userId);
  return { person, view: toActorView(person, evidence), evidence };
}

/** Blocks and host exclusions, loaded once per request. */
export async function loadSafetyGraph(ports: Ports): Promise<SafetyGraph> {
  const [blocks, exclusions] = await Promise.all([
    ports.repo.listBlocks(),
    ports.repo.listHostExclusions(),
  ]);
  return createSafetyGraph(blocks, exclusions);
}

export async function track(ports: Ports, input: Omit<AnalyticsInput, 'at'>): Promise<void> {
  await ports.repo.appendAnalytics(
    buildAnalyticsEvent(ports.newId('evt'), { ...input, at: ports.now() }),
  );
}

export async function audit(
  ports: Ports,
  entry: {
    readonly actorId: UserId | null;
    readonly action: string;
    readonly subjectType: string;
    readonly subjectId: string;
    readonly metadata?: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  await ports.repo.appendAudit({
    id: ports.newId('audit'),
    at: ports.now(),
    actorId: entry.actorId,
    action: entry.action,
    subjectType: entry.subjectType,
    subjectId: entry.subjectId,
    metadata: entry.metadata ?? {},
  });
}
