import { beforeEach, describe, expect, it } from 'vitest';

import { DEMO_USERS } from '@indenoi/db/demo';
import { CITY_IDS } from '@indenoi/geo';

import { POST as setActiveCity } from '../app/api/active-city/route';
import { GET as discover } from '../app/api/discover/route';
import { GET as insights } from '../app/api/insights/route';
import { POST as createInvite, PUT as acceptInvite } from '../app/api/invites/route';
import { POST as onboard } from '../app/api/onboarding/route';
import { GET as people } from '../app/api/people/route';
import { POST as createPost } from '../app/api/posts/route';
import { GET as profile } from '../app/api/profiles/[handle]/route';
import { GET as signalDetail } from '../app/api/signals/[id]/route';
import { POST as track } from '../app/api/track/route';
import { GET as threads } from '../app/api/threads/route';
import { GET as threadView } from '../app/api/threads/[id]/route';
import { POST as vouch } from '../app/api/vouches/route';
import { getStore, resetStore } from '../lib/store';

const BASE = 'http://localhost:3000';

function request(path: string, init: RequestInit & { as?: string } = {}): Request {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (init.as !== undefined) headers.set('cookie', `indenoi_demo_session=${init.as}`);
  return new Request(`${BASE}${path}`, { ...init, headers });
}

beforeEach(() => {
  resetStore();
});

describe('every route refuses an anonymous caller', () => {
  it('returns 401 with private headers and no body detail', async () => {
    const responses = await Promise.all([
      discover(request(`/api/discover?city=${CITY_IDS.ajaccio}`)),
      insights(request('/api/insights')),
      people(request(`/api/people?city=${CITY_IDS.ajaccio}`)),
      threads(request('/api/threads')),
      createPost(request('/api/posts', { method: 'POST', body: '{}' })),
      track(request('/api/track', { method: 'POST', body: '{}' })),
      vouch(request('/api/vouches', { method: 'POST', body: '{}' })),
      createInvite(request('/api/invites', { method: 'POST', body: '{}' })),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('vary')).toContain('Cookie');
      expect(await response.json()).toEqual({ reason: 'unauthenticated' });
    }
  });
});

describe('discover', () => {
  it('ranks the active city first and explains every score', async () => {
    const response = await discover(
      request(`/api/discover?city=${CITY_IDS.ajaccio}`, { as: DEMO_USERS.hugo }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      city: { id: string; name: string };
      cards: { post: { geoScopeId: string; demo: boolean }; breakdown: Record<string, number> }[];
    };
    expect(body.city.name).toBe('Ajaccio');
    expect(body.cards.length).toBeGreaterThan(0);
    expect(body.cards[0]?.post.geoScopeId).toBe(CITY_IDS.ajaccio);
    expect(body.cards[0]?.post.demo).toBe(true);
    expect(Object.keys(body.cards[0]?.breakdown ?? {})).toContain('geography');
  });

  it('offers a contextual action on every card, checked against policy first', async () => {
    const response = await discover(
      request(`/api/discover?city=${CITY_IDS.ajaccio}`, { as: DEMO_USERS.hugo }),
    );
    const body = (await response.json()) as {
      cards: { post: { author: { id: string } }; actions: { kind: string; enabled: boolean }[] }[];
    };
    for (const card of body.cards) {
      expect(card.actions.map((action) => action.kind)).toContain('ask');
      if (card.post.author.id === DEMO_USERS.hugo) {
        expect(card.actions.every((action) => !action.enabled)).toBe(true);
      }
    }
  });

  it('rejects a city that is not in the gazetteer', async () => {
    const response = await discover(
      request('/api/discover?city=geo:city:atlantis', { as: DEMO_USERS.hugo }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ reason: 'unknown_city' });
  });
});

describe('switching city', () => {
  it('accepts any city in the gazetteer and remembers it in a hardened cookie', async () => {
    const response = await setActiveCity(
      request('/api/active-city', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({ geoScopeId: CITY_IDS.kilrush }),
      }),
    );
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('indenoi_active_city');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');

    const events = await getStore().ports.repo.listAnalytics();
    expect(events.some((event) => event.name === 'city_switched')).toBe(true);
  });

  it('refuses a city it cannot resolve', async () => {
    const response = await setActiveCity(
      request('/api/active-city', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({ geoScopeId: 'geo:city:atlantis' }),
      }),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});

describe('onboarding', () => {
  it('refuses an age below the baseline and hands out no session', async () => {
    const response = await onboard(
      request('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          age: 14,
          personaId: DEMO_USERS.ines,
          geoScopeId: CITY_IDS.ajaccio,
          kind: 'resident',
        }),
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ reason: 'age_below_minimum' });
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('takes a 15-year-old, keeps the band and opens a session', async () => {
    const response = await onboard(
      request('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          age: 15,
          personaId: DEMO_USERS.ines,
          geoScopeId: CITY_IDS.ajaccio,
          kind: 'resident',
          practices: ['illustration'],
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.text();
    expect(body).not.toContain('15');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('refuses a persona whose account band contradicts the declared age', async () => {
    const response = await onboard(
      request('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          age: 30,
          personaId: DEMO_USERS.ines,
          geoScopeId: CITY_IDS.ajaccio,
          kind: 'resident',
        }),
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ reason: 'age_band_mismatch' });
  });
});

describe('publishing', () => {
  it('lets a resident publish into their own city', async () => {
    const response = await createPost(
      request('/api/posts', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({
          geoScopeId: CITY_IDS.ajaccio,
          caption: 'Flat sea, no wind, nobody on the water.',
          practice: 'freediving',
          motif: 'sea',
        }),
      }),
    );
    expect(response.status).toBe(201);
  });

  it('refuses to let a visitor publish as a local', async () => {
    const response = await createPost(
      request('/api/posts', {
        method: 'POST',
        as: DEMO_USERS.tom,
        body: JSON.stringify({ geoScopeId: CITY_IDS.porto, caption: 'Hello Porto', motif: 'sea' }),
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ reason: 'no_local_attachment' });
  });
});

describe('people, profiles and threads', () => {
  it('never lists a minor for an adult browsing people', async () => {
    const response = await people(
      request(`/api/people?city=${CITY_IDS.ajaccio}`, { as: DEMO_USERS.hugo }),
    );
    const body = (await response.json()) as { people: { id: string; handle: string }[] };
    expect(body.people.length).toBeGreaterThan(0);
    expect(body.people.some((entry) => entry.id === DEMO_USERS.ines)).toBe(false);
  });

  it('serves a profile without any private trust state', async () => {
    const response = await profile(request('/api/profiles/demo-lea', { as: DEMO_USERS.hugo }), {
      params: Promise.resolve({ handle: 'demo-lea' }),
    });
    expect(response.status).toBe(200);
    const raw = await response.text();
    expect(raw).not.toContain('ageBand');
    expect(raw).not.toContain('accountState');
    expect(raw).not.toContain('providerRef');
  });

  it('hides a blocked account behind a plain 404', async () => {
    const response = await profile(request('/api/profiles/demo-noa', { as: DEMO_USERS.claire }), {
      params: Promise.resolve({ handle: 'demo-noa' }),
    });
    expect(response.status).toBe(404);
  });

  it('serves a thread only to its participants', async () => {
    const mine = await threadView(request('/api/threads/thr-seed-1', { as: DEMO_USERS.marc }), {
      params: Promise.resolve({ id: 'thr-seed-1' }),
    });
    expect(mine.status).toBe(200);

    const theirs = await threadView(request('/api/threads/thr-seed-1', { as: DEMO_USERS.claire }), {
      params: Promise.resolve({ id: 'thr-seed-1' }),
    });
    expect(theirs.status).toBe(404);
  });

  it('lists a signal detail with host-only material withheld', async () => {
    const guest = await signalDetail(request('/api/signals/sig-ajaccio-offer', { as: DEMO_USERS.hugo }), {
      params: Promise.resolve({ id: 'sig-ajaccio-offer' }),
    });
    const guestBody = (await guest.json()) as { responses: unknown[]; hostPowers: string[] };
    expect(guestBody.responses).toEqual([]);
    expect(guestBody.hostPowers).toEqual([]);

    const host = await signalDetail(request('/api/signals/sig-ajaccio-offer', { as: DEMO_USERS.marc }), {
      params: Promise.resolve({ id: 'sig-ajaccio-offer' }),
    });
    const hostBody = (await host.json()) as { responses: unknown[]; hostPowers: string[] };
    expect(hostBody.responses.length).toBeGreaterThan(0);
    expect(hostBody.hostPowers).toContain('accept_response');
  });
});

describe('invitations and vouching', () => {
  it('issues a code that somebody else can accept exactly once', async () => {
    const created = await createInvite(
      request('/api/invites', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({ geoScopeId: CITY_IDS.ajaccio }),
      }),
    );
    expect(created.status).toBe(201);
    const { code } = (await created.json()) as { code: string };

    const mine = await acceptInvite(
      request('/api/invites', {
        method: 'PUT',
        as: DEMO_USERS.lea,
        body: JSON.stringify({ code }),
      }),
    );
    expect(mine.status).toBe(403);

    const accepted = await acceptInvite(
      request('/api/invites', {
        method: 'PUT',
        as: DEMO_USERS.tom,
        body: JSON.stringify({ code }),
      }),
    );
    expect(accepted.status).toBe(200);

    const again = await acceptInvite(
      request('/api/invites', {
        method: 'PUT',
        as: DEMO_USERS.hugo,
        body: JSON.stringify({ code }),
      }),
    );
    expect(again.status).toBe(404);
  });

  it('refuses a vouch from an account with no tie to any place', async () => {
    const response = await vouch(
      request('/api/vouches', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({
          subjectId: DEMO_USERS.lea,
          geoScopeId: CITY_IDS.ajaccio,
          statement: 'me',
        }),
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ reason: 'self' });
  });
});

describe('instrumentation', () => {
  it('accepts only the closed set of view events', async () => {
    const good = await track(
      request('/api/track', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({ name: 'discover_impression', geoScopeId: CITY_IDS.ajaccio }),
      }),
    );
    expect(good.status).toBe(202);

    const bad = await track(
      request('/api/track', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({ name: 'message_sent', geoScopeId: CITY_IDS.ajaccio }),
      }),
    );
    expect(bad.status).toBe(400);
  });

  it('never lets an arbitrary payload reach the analytics store', async () => {
    await track(
      request('/api/track', {
        method: 'POST',
        as: DEMO_USERS.lea,
        body: JSON.stringify({
          name: 'profile_open',
          geoScopeId: CITY_IDS.ajaccio,
          lat: 41.9,
          email: 'lea@example.test',
        }),
      }),
    );
    const events = await getStore().ports.repo.listAnalytics();
    const written = JSON.stringify(events.filter((event) => event.id.startsWith('evt-d')));
    expect(written).not.toContain('41.9');
    expect(written).not.toContain('example.test');
  });
});

describe('internal insights', () => {
  it('reports activation per city without naming anybody', async () => {
    const response = await insights(request('/api/insights', { as: DEMO_USERS.maya }));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      report: { cities: { geoScopeId: string; activationScore: number }[] };
      totals: { people: number };
    };
    expect(body.report.cities.length).toBeGreaterThan(1);
    expect(body.totals.people).toBeGreaterThan(0);

    const raw = JSON.stringify(body);
    expect(raw).not.toContain('demo-lea');
    expect(raw).not.toContain('Léa');
  });

  it('does not rank a big city above a small one that converts', async () => {
    const response = await insights(request('/api/insights', { as: DEMO_USERS.maya }));
    const body = (await response.json()) as {
      report: { cities: { geoScopeId: string }[] };
    };
    const order = body.report.cities.map((row) => row.geoScopeId);
    expect(order.indexOf(CITY_IDS.ajaccio)).toBeLessThan(order.indexOf(CITY_IDS.paris));
    expect(order.indexOf(CITY_IDS.kilrush)).toBeLessThan(order.indexOf(CITY_IDS.paris));
  });
});
