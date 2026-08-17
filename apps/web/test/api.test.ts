import { beforeEach, describe, expect, it } from 'vitest';

import { DEMO_USERS } from '@indenoi/db/demo';
import { CITY_IDS } from '@indenoi/geo';

import { POST as appreciate } from '../app/api/appreciations/route';
import { POST as block } from '../app/api/blocks/route';
import { GET as searchCities, POST as addCity } from '../app/api/cities/route';
import { GET as insights } from '../app/api/insights/route';
import { POST as report } from '../app/api/reports/route';
import { POST as createSignal } from '../app/api/signals/route';
import { POST as respond } from '../app/api/signals/[id]/respond/route';
import { POST as setSession } from '../app/api/session/route';
import { getStore, resetStore } from '../lib/store';

const BASE = 'http://localhost:3000';

function request(path: string, init: RequestInit & { as?: string } = {}): Request {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (init.as !== undefined) headers.set('cookie', `indenoi_demo_session=${init.as}`);
  return new Request(`${BASE}${path}`, { ...init, headers });
}

async function firstAjaccioPostId(): Promise<string> {
  const posts = await getStore().ports.repo.listPosts();
  const post = posts.find(
    (entry) => entry.geoScopeId === CITY_IDS.ajaccio && entry.authorId !== DEMO_USERS.hugo,
  );
  if (post === undefined) throw new Error('no demo post');
  return post.id;
}

beforeEach(() => {
  resetStore();
});

describe('INV-CACHE-1 personalised responses are never cacheable', () => {
  it('marks every API response private and uncacheable', async () => {
    const responses = await Promise.all([
      searchCities(request('/api/cities?q=ajac', { as: DEMO_USERS.lea })),
      insights(request('/api/insights', { as: DEMO_USERS.lea })),
      appreciate(
        request('/api/appreciations', {
          method: 'POST',
          as: DEMO_USERS.hugo,
          body: JSON.stringify({ postId: await firstAjaccioPostId() }),
        }),
      ),
    ]);
    for (const response of responses) {
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('vary')).toContain('Cookie');
    }
  });

  it('does not leak one viewer state into another response', async () => {
    const postId = await firstAjaccioPostId();
    await appreciate(
      request('/api/appreciations', {
        method: 'POST',
        as: DEMO_USERS.hugo,
        body: JSON.stringify({ postId }),
      }),
    );
    const second = await appreciate(
      request('/api/appreciations', {
        method: 'POST',
        as: DEMO_USERS.tom,
        body: JSON.stringify({ postId }),
      }),
    );
    const body = (await second.json()) as { appreciated: boolean };
    expect(body.appreciated).toBe(true);
  });
});

describe('authentication boundary', () => {
  it('rejects an unauthenticated mutation', async () => {
    const response = await appreciate(
      request('/api/appreciations', { method: 'POST', body: JSON.stringify({ postId: 'p1' }) }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('only accepts a known demo persona and sets a hardened cookie', async () => {
    const bad = await setSession(
      request('/api/session', { method: 'POST', body: JSON.stringify({ userId: 'usr-not-real' }) }),
    );
    expect(bad.status).toBe(400);

    const good = await setSession(
      request('/api/session', { method: 'POST', body: JSON.stringify({ userId: DEMO_USERS.lea }) }),
    );
    expect(good.status).toBe(200);
    const cookie = good.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
  });
});

describe('policy is enforced at the API boundary, not only in the UI', () => {
  it('refuses a response to a signal from a blocked account', async () => {
    const created = await createSignal(
      request('/api/signals', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({
          type: 'ask',
          title: 'Anyone got a spare mask?',
          body: 'Mine leaks.',
          geoScopeId: CITY_IDS.ajaccio,
        }),
      }),
    );
    expect(created.status).toBe(201);
    const { signalId } = (await created.json()) as { signalId: string };

    await block(
      request('/api/blocks', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({ targetId: DEMO_USERS.hugo }),
      }),
    );

    const attempt = await respond(
      request(`/api/signals/${signalId}/respond`, {
        method: 'POST',
        as: DEMO_USERS.hugo,
        body: JSON.stringify({ message: 'I have one' }),
      }),
      { params: Promise.resolve({ id: signalId }) },
    );
    expect(attempt.status).toBe(403);
    expect((await attempt.json()) as { reason: string }).toEqual({ reason: 'blocked' });
  });

  it('refuses an adult response to a minor Ask', async () => {
    const created = await createSignal(
      request('/api/signals', {
        method: 'POST',
        as: DEMO_USERS.ines,
        body: JSON.stringify({
          type: 'ask',
          title: 'Sticker printing?',
          body: 'For my illustrations.',
          geoScopeId: CITY_IDS.ajaccio,
        }),
      }),
    );
    const { signalId } = (await created.json()) as { signalId: string };
    const attempt = await respond(
      request(`/api/signals/${signalId}/respond`, {
        method: 'POST',
        as: DEMO_USERS.marc,
        body: JSON.stringify({ message: 'come to my workshop' }),
      }),
      { params: Promise.resolve({ id: signalId }) },
    );
    expect(attempt.status).toBe(403);
    expect((await attempt.json()) as { reason: string }).toEqual({ reason: 'age_band_mismatch' });
  });

  it('refuses to publish into a city the account has no tie to', async () => {
    const response = await createSignal(
      request('/api/signals', {
        method: 'POST',
        as: DEMO_USERS.tom,
        body: JSON.stringify({
          type: 'event',
          title: 'Climbing meetup',
          body: 'In a city I have never been to.',
          geoScopeId: CITY_IDS.kilrush,
        }),
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()) as { reason: string }).toEqual({ reason: 'no_local_attachment' });
  });

  it('validates its input instead of trusting it', async () => {
    const response = await createSignal(
      request('/api/signals', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({ type: 'romantic', title: 'x', body: 'y', geoScopeId: CITY_IDS.ajaccio }),
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe('city surface', () => {
  it('searches any city in the gazetteer', async () => {
    const response = await searchCities(request('/api/cities?q=porto', { as: DEMO_USERS.lea }));
    const body = (await response.json()) as { cities: { id: string; name: string }[] };
    expect(body.cities[0]?.name).toBe('Porto');
  });

  it('searches a city that is not in the hand-curated seed', async () => {
    const response = await searchCities(request('/api/cities?q=tokyo'));
    const body = (await response.json()) as { cities: { id: string; name: string; countryCode: string }[] };
    expect(body.cities.some((city) => /tokyo/i.test(city.name) && city.countryCode === 'JP')).toBe(true);
  });

  it('adds a city with no evidence required', async () => {
    const response = await addCity(
      request('/api/cities', {
        method: 'POST',
        as: DEMO_USERS.tom,
        body: JSON.stringify({ geoScopeId: CITY_IDS.kilrush, kind: 'exploring' }),
      }),
    );
    expect(response.status).toBe(201);
  });
});

describe('reporting', () => {
  it('confirms the report without echoing moderation state', async () => {
    const response = await report(
      request('/api/reports', {
        method: 'POST',
        as: DEMO_USERS.hugo,
        body: JSON.stringify({
          targetType: 'post',
          targetId: await firstAjaccioPostId(),
          reason: 'harassment',
          note: 'private moderator context',
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.text();
    expect(body).not.toContain('private moderator context');
    expect(body).not.toContain('caseId');
  });
});
