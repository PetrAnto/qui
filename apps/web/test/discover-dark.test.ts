import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { blockUser, getPeopleInCity, type AccountState } from '@indenoi/core';
import { DEMO_USERS } from '@indenoi/db/demo';
import { CITY_IDS } from '@indenoi/geo';

import { getStore, resetStore } from '../lib/store';

/**
 * The dark Discover preview's people strip, actually rendered. It must show
 * exactly what the People mode shows — the central `canDiscoverUser` policy via
 * `getPeopleInCity` — so a minor, a blocked pair or a suspended account never
 * reaches it. Only the session cookie and Next's helpers are stubbed.
 */
const session = vi.hoisted(() => ({ viewerId: null as string | null }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'indenoi_demo_session' && session.viewerId !== null ? { value: session.viewerId } : undefined,
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: () => {
    throw new Error('NEXT_REDIRECT');
  },
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  usePathname: () => '/',
}));

const { default: DiscoverPage } = await import('../app/page');

async function render(viewerId: string, theme?: string): Promise<string> {
  session.viewerId = viewerId;
  const element = await DiscoverPage({ searchParams: Promise.resolve(theme === undefined ? {} : { theme }) });
  return renderToStaticMarkup(element);
}

/** Display names in the people strip, in order. */
function strip(html: string): string[] {
  return [...html.matchAll(/class="dd-person__name">([^<]+)</g)].map((match) => match[1] ?? '');
}

async function discoverable(viewerId: string): Promise<string[]> {
  const people = await getPeopleInCity(getStore().ports, { viewerId, geoScopeId: CITY_IDS.ajaccio });
  return (people ?? []).map((person) => person.displayName);
}

async function setState(userId: string, accountState: AccountState): Promise<void> {
  const repo = getStore().ports.repo;
  const person = await repo.getPerson(userId);
  if (person === null) throw new Error('missing person');
  await repo.putPerson({ ...person, accountState });
}

beforeEach(() => {
  resetStore();
  session.viewerId = null;
});

describe('the dark Discover people strip follows the central discovery policy', () => {
  it('shows exactly the People mode, and never a minor to an adult', async () => {
    const names = strip(await render(DEMO_USERS.lea, 'dark'));
    expect(names.length).toBeGreaterThan(0);
    expect(names).toEqual(await discoverable(DEMO_USERS.lea));
    // Inès is a minor with a tie to Ajaccio: her posts may be in the feed, but
    // she is never surfaced to an adult as a person to discover (INV-AGE-3).
    expect(names).not.toContain('Inès');
    expect(names).not.toContain('Léa');
  });

  it('drops a person blocked in either direction', async () => {
    const before = strip(await render(DEMO_USERS.lea, 'dark'));
    expect(before).toEqual(expect.arrayContaining(['Hugo', 'Marc']));
    await blockUser(getStore().ports, { actorId: DEMO_USERS.lea, targetId: DEMO_USERS.hugo });
    await blockUser(getStore().ports, { actorId: DEMO_USERS.marc, targetId: DEMO_USERS.lea });
    const after = strip(await render(DEMO_USERS.lea, 'dark'));
    expect(after).not.toContain('Hugo');
    expect(after).not.toContain('Marc');
    expect(after).toEqual(await discoverable(DEMO_USERS.lea));
  });

  it('drops a suspended account', async () => {
    expect(strip(await render(DEMO_USERS.lea, 'dark'))).toContain('Maya');
    await setState(DEMO_USERS.maya, 'suspended');
    expect(strip(await render(DEMO_USERS.lea, 'dark'))).not.toContain('Maya');
  });

  it('leaves the light Discover without the preview or its strip', async () => {
    for (const theme of [undefined, 'light', 'DARK']) {
      const html = await render(DEMO_USERS.lea, theme);
      expect(html).not.toContain('discover-dark');
      expect(strip(html)).toEqual([]);
    }
  });
});
