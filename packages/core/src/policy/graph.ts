import type { BlockEdge, HostExclusion, SignalId, UserId } from '../types';

/**
 * The relationship facts policy needs, precomputed by the caller.
 *
 * Blocking is symmetric *in effect*: whoever pressed the button, the two
 * accounts stop existing for each other (ADR-0010). Modelling that here rather
 * than at each call site is what makes INV-BLOCK-* enforceable in one place.
 */
export interface SafetyGraph {
  isBlockedBetween(a: UserId, b: UserId): boolean;
  /** Everyone who is invisible to, or invisible from, this viewer. */
  blockedFor(userId: UserId): ReadonlySet<UserId>;
  isHostExcluded(signalId: SignalId, userId: UserId): boolean;
}

export function createSafetyGraph(
  blocks: readonly BlockEdge[],
  exclusions: readonly HostExclusion[] = [],
): SafetyGraph {
  const adjacency = new Map<UserId, Set<UserId>>();
  const link = (a: UserId, b: UserId): void => {
    let set = adjacency.get(a);
    if (!set) {
      set = new Set<UserId>();
      adjacency.set(a, set);
    }
    set.add(b);
  };
  for (const block of blocks) {
    link(block.blockerId, block.blockedId);
    link(block.blockedId, block.blockerId);
  }

  const excluded = new Set<string>();
  for (const exclusion of exclusions) {
    excluded.add(`${exclusion.signalId}::${exclusion.userId}`);
  }

  const empty: ReadonlySet<UserId> = new Set<UserId>();

  return {
    isBlockedBetween(a, b) {
      return adjacency.get(a)?.has(b) ?? false;
    },
    blockedFor(userId) {
      return adjacency.get(userId) ?? empty;
    },
    isHostExcluded(signalId, userId) {
      return excluded.has(`${signalId}::${userId}`);
    },
  };
}

export const EMPTY_SAFETY_GRAPH: SafetyGraph = createSafetyGraph([], []);
