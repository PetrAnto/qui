import { describe, expect, it } from 'vitest';

import { createSafetyGraph } from '../src/policy/graph';
import { rankDiscover, RANKING_WEIGHTS, type RankCandidate } from '../src/ranking';
import { actor, post } from './fixtures';

const NOW = '2026-03-03T12:00:00.000Z';
const HERE = 'geo:city:here';
const THERE = 'geo:city:there';
const graph = createSafetyGraph([]);

const viewer = actor('viewer');

function candidate(
  id: string,
  authorId: string,
  overrides: Partial<RankCandidate> & { geoScopeId?: string; createdAt?: string; practice?: string | null } = {},
): RankCandidate {
  return {
    post: post(id, authorId, {
      geoScopeId: overrides.geoScopeId ?? HERE,
      createdAt: overrides.createdAt ?? NOW,
      practice: overrides.practice ?? null,
    }),
    author: actor(authorId),
    appreciations: overrides.appreciations ?? 0,
    localAppreciations: overrides.localAppreciations ?? 0,
  };
}

function context(overrides: Partial<Parameters<typeof rankDiscover>[1]> = {}) {
  return {
    viewer,
    viewerInterests: [] as string[],
    activeGeoScopeId: HERE,
    followedGeoScopeIds: [THERE],
    graph,
    now: NOW,
    ...overrides,
  };
}

describe('discover ranking', () => {
  it('is deterministic across runs and input order', () => {
    const candidates = [
      candidate('p1', 'a', { appreciations: 3 }),
      candidate('p2', 'b', { geoScopeId: THERE }),
      candidate('p3', 'c', { createdAt: '2026-03-01T12:00:00.000Z' }),
    ];
    const first = rankDiscover(candidates, context()).map((entry) => entry.post.id);
    const second = rankDiscover([...candidates].reverse(), context()).map((entry) => entry.post.id);
    expect(first).toEqual(second);
    expect(first).toEqual(rankDiscover(candidates, context()).map((entry) => entry.post.id));
  });

  it('prefers the active city over a followed one, all else equal', () => {
    const ranked = rankDiscover(
      [candidate('far', 'a', { geoScopeId: THERE }), candidate('near', 'b')],
      context(),
    );
    expect(ranked[0]?.post.id).toBe('near');
  });

  it('decays with age', () => {
    const ranked = rankDiscover(
      [candidate('old', 'a', { createdAt: '2026-02-27T12:00:00.000Z' }), candidate('new', 'b')],
      context(),
    );
    expect(ranked[0]?.post.id).toBe('new');
  });

  it('penalises a creator who floods the feed', () => {
    const ranked = rankDiscover(
      [
        candidate('a1', 'a'),
        candidate('a2', 'a'),
        candidate('a3', 'a'),
        candidate('b1', 'b', { createdAt: '2026-03-02T12:00:00.000Z' }),
      ],
      context(),
    );
    expect(ranked[0]?.post.id).toBe('a1');
    expect(ranked[1]?.post.id).toBe('b1');
    expect(ranked[2]?.breakdown['repeatCreatorPenalty']).toBeLessThan(0);
  });

  it('boosts a practice the viewer cares about', () => {
    const ranked = rankDiscover(
      [candidate('plain', 'a'), candidate('match', 'b', { practice: 'Bread baking' })],
      context({ viewerInterests: ['bread baking'] }),
    );
    expect(ranked[0]?.post.id).toBe('match');
  });

  it('explains every score it produces', () => {
    const [top] = rankDiscover([candidate('p1', 'a', { appreciations: 2, localAppreciations: 2 })], context());
    expect(top).toBeDefined();
    const sum = Object.values(top?.breakdown ?? {}).reduce((total, value) => total + value, 0);
    expect(Math.abs(sum - (top?.score ?? 0))).toBeLessThan(0.001);
  });

  it('cannot let engagement outweigh eligibility', () => {
    expect(RANKING_WEIGHTS.engagement).toBeLessThan(RANKING_WEIGHTS.geography);
  });
});
