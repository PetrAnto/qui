import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { confirmHost, createSignal, joinSignal, publishProposal, volunteerToHost, type AccountState } from '@indenoi/core';
import { DEMO_USERS } from '@indenoi/db/demo';
import { CITY_IDS } from '@indenoi/geo';

import { getStore, resetStore } from '../lib/store';

/**
 * The signal page, actually rendered. The session cookie and Next's
 * navigation helpers are the only things stubbed; the page, the core service
 * and the demo store are the real ones.
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
  usePathname: () => '/signals',
}));

const { default: SignalPage } = await import('../app/signals/[id]/page');

const TITLE = 'Late swim at the old harbour';
const BODY = 'Meet by the blue door, bring a torch.';

async function render(viewerId: string, signalId: string): Promise<string> {
  session.viewerId = viewerId;
  const element = await SignalPage({ params: Promise.resolve({ id: signalId }) });
  return renderToStaticMarkup(element);
}

async function leaSignal(audience: 'all' | 'adults_only'): Promise<string> {
  const created = await createSignal(getStore().ports, {
    actorId: DEMO_USERS.lea,
    type: 'event',
    title: TITLE,
    body: BODY,
    geoScopeId: CITY_IDS.ajaccio,
    audience,
  });
  if (!created.ok) throw new Error(`setup failed: ${created.reason}`);
  return created.value.signalId;
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

async function marcProposalHostedByLea(): Promise<string> {
  const ports = getStore().ports;
  const published = await publishProposal(ports, {
    actorId: DEMO_USERS.marc,
    input: {
      practice: 'Paddle',
      geoScopeId: CITY_IDS.ajaccio,
      slots: [{ date: '2026-08-18', part: 'afternoon', preferred: false }],
      durationMinutes: 90,
    },
    proposalKey: 'page-host-0001',
  });
  if (!published.ok) throw new Error(`setup failed: ${published.reason}`);
  const signalId = published.value.signalId;
  await volunteerToHost(ports, { actorId: DEMO_USERS.lea, signalId });
  const confirmed = await confirmHost(ports, { proposerId: DEMO_USERS.marc, signalId, volunteerId: DEMO_USERS.lea });
  if (!confirmed.ok) throw new Error(`setup failed: ${confirmed.reason}`);
  return signalId;
}

describe('the rendered page of a proposal hosted by somebody else', () => {
  it('offers the proposer the ordinary join action, and no host controls', async () => {
    const id = await marcProposalHostedByLea();
    const html = await render(DEMO_USERS.marc, id);
    expect(html).toContain('Hosted by Léa');
    expect(html).toContain('You are not on the list unless you join');
    expect(html).toContain('Ask to join');
    expect(html).not.toContain('Close it to new people');
    expect(html).not.toContain('Remove');
  });

  it('shows the proposer as on the list once they joined, still without host controls', async () => {
    const id = await marcProposalHostedByLea();
    const joined = await joinSignal(getStore().ports, { actorId: DEMO_USERS.marc, signalId: id });
    if (!joined.ok) throw new Error('join failed');
    const html = await render(DEMO_USERS.marc, id);
    expect(html).toContain('You are on the list');
    expect(html).not.toContain('Close it to new people');
  });

  it('keeps the proposer of a hostless proposal without any participation action', async () => {
    const published = await publishProposal(getStore().ports, {
      actorId: DEMO_USERS.marc,
      input: {
        practice: 'Paddle',
        geoScopeId: CITY_IDS.ajaccio,
        slots: [{ date: '2026-08-18', part: 'afternoon', preferred: false }],
        durationMinutes: 90,
      },
      proposalKey: 'page-host-0002',
    });
    if (!published.ok) throw new Error('setup failed');
    const html = await render(DEMO_USERS.marc, published.value.signalId);
    expect(html).toContain('Your proposal. It has no host yet');
    expect(html).not.toContain('Ask to join');
  });
});

describe('the rendered signal page', () => {
  it('renders nothing of an adults-only signal for a minor — not found', async () => {
    const id = await leaSignal('adults_only');
    await expect(render(DEMO_USERS.ines, id)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders an adults-only signal for an eligible adult', async () => {
    const id = await leaSignal('adults_only');
    const html = await render(DEMO_USERS.hugo, id);
    expect(html).toContain(TITLE);
    expect(html).toContain(BODY);
  });

  it('renders nothing of a suspended author’s signal for another viewer — not found', async () => {
    const id = await leaSignal('all');
    await setState(DEMO_USERS.lea, 'suspended');
    await expect(render(DEMO_USERS.hugo, id)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('still renders a suspended author’s own signal for them', async () => {
    const id = await leaSignal('all');
    await setState(DEMO_USERS.lea, 'suspended');
    expect(await render(DEMO_USERS.lea, id)).toContain(TITLE);
  });

  it('renders a restricted author’s signal by direct link', async () => {
    const id = await leaSignal('all');
    await setState(DEMO_USERS.lea, 'distribution_restricted');
    expect(await render(DEMO_USERS.hugo, id)).toContain(TITLE);
  });
});
