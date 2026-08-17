import type { GeoScopeId, Instant, Post } from './types';
import { canViewPost } from './policy/access';
import type { ActorView } from './policy/decision';
import type { SafetyGraph } from './policy/graph';

/**
 * Discover ranking (ADR-0008).
 *
 * Deterministic and auditable on purpose: the same inputs always produce the
 * same order, and every score can be explained term by term in the UI. There is
 * no model here, and there is deliberately no term that scores a *person* —
 * only the relevance of a piece of content to a viewer's places and interests.
 */
export const RANKING_WEIGHTS = Object.freeze({
  freshness: 0.34,
  geography: 0.3,
  affinity: 0.16,
  engagement: 0.14,
  localTraction: 0.06,
  /** Applied per additional post by the same creator, to keep the feed plural. */
  repeatCreatorPenalty: 0.25,
});

/** Content older than this contributes no freshness at all. */
const FRESHNESS_WINDOW_HOURS = 168;

export interface RankCandidate {
  readonly post: Post;
  readonly author: ActorView;
  readonly appreciations: number;
  /** Appreciations coming from people attached to the post's own city. */
  readonly localAppreciations: number;
}

export interface RankingContext {
  readonly viewer: ActorView;
  readonly viewerInterests: readonly string[];
  readonly activeGeoScopeId: GeoScopeId;
  readonly followedGeoScopeIds: readonly GeoScopeId[];
  readonly graph: SafetyGraph;
  readonly now: Instant;
}

export interface RankedPost {
  readonly post: Post;
  readonly score: number;
  readonly breakdown: Readonly<Record<string, number>>;
}

function hoursBetween(from: Instant, to: Instant): number {
  return (Date.parse(to) - Date.parse(from)) / 3_600_000;
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function rankDiscover(
  candidates: readonly RankCandidate[],
  context: RankingContext,
): readonly RankedPost[] {
  const followed = new Set(context.followedGeoScopeIds);
  const interests = new Set(context.viewerInterests.map((value) => value.toLowerCase()));

  // Eligibility is a filter, never a weight: safety is not tradeable against
  // engagement.
  const eligible = candidates.filter(
    (candidate) =>
      canViewPost(context.viewer, candidate.post, candidate.author, context.graph).allowed,
  );

  const scored = eligible.map((candidate) => {
    const ageHours = Math.max(0, hoursBetween(candidate.post.createdAt, context.now));
    const freshness = Math.max(0, 1 - ageHours / FRESHNESS_WINDOW_HOURS);

    const geography =
      candidate.post.geoScopeId === context.activeGeoScopeId
        ? 1
        : followed.has(candidate.post.geoScopeId)
          ? 0.4
          : 0;

    const practice = candidate.post.practice?.toLowerCase() ?? null;
    const affinity = practice !== null && interests.has(practice) ? 1 : 0;

    // Saturating, so a runaway post cannot dominate the whole feed.
    const engagement = candidate.appreciations / (candidate.appreciations + 5);
    const localTraction =
      candidate.appreciations === 0 ? 0 : candidate.localAppreciations / candidate.appreciations;

    const breakdown = {
      freshness: round(freshness * RANKING_WEIGHTS.freshness),
      geography: round(geography * RANKING_WEIGHTS.geography),
      affinity: round(affinity * RANKING_WEIGHTS.affinity),
      engagement: round(engagement * RANKING_WEIGHTS.engagement),
      localTraction: round(localTraction * RANKING_WEIGHTS.localTraction),
    };
    const score = round(Object.values(breakdown).reduce((sum, value) => sum + value, 0));
    return { post: candidate.post, score, breakdown };
  });

  // Stable ordering: score, then recency, then id. No randomness anywhere.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.post.createdAt !== b.post.createdAt) {
      return a.post.createdAt < b.post.createdAt ? 1 : -1;
    }
    return a.post.id < b.post.id ? -1 : 1;
  });

  return applyCreatorDiversity(scored);
}

/**
 * Re-sorts after charging each creator's second, third… post a penalty. Done as
 * a second pass so the penalty is visible in the breakdown the UI can show.
 */
function applyCreatorDiversity(scored: readonly RankedPost[]): readonly RankedPost[] {
  const seen = new Map<string, number>();
  const adjusted = scored.map((entry) => {
    const previous = seen.get(entry.post.authorId) ?? 0;
    seen.set(entry.post.authorId, previous + 1);
    if (previous === 0) return entry;
    const penalty = round(-RANKING_WEIGHTS.repeatCreatorPenalty * previous);
    return {
      post: entry.post,
      score: round(entry.score + penalty),
      breakdown: { ...entry.breakdown, repeatCreatorPenalty: penalty },
    };
  });

  adjusted.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.post.createdAt !== b.post.createdAt) {
      return a.post.createdAt < b.post.createdAt ? 1 : -1;
    }
    return a.post.id < b.post.id ? -1 : 1;
  });
  return adjusted;
}
