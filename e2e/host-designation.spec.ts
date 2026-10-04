import { expect, test, type Page } from '@playwright/test';

import { onboard } from './helpers';

/**
 * Volunteer → proposer confirms → designated host shown → an eligible person
 * joins (ADR-0016 P1, INV-HOST-3), through the real UI and API.
 *
 * Cast (synthetic demo): Marc proposes in Ajaccio; Léa (Ajaccio resident)
 * offers to host; Hugo (local tie by family) joins; Inès is a minor. A practice
 * nobody seeded ("kayak") guarantees a fresh proposal.
 */

test.describe.configure({ mode: 'serial' });

async function become(page: Page, name: RegExp): Promise<void> {
  await page.goto('/me');
  await page.getByRole('button', { name }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

async function proposeAsMarc(page: Page): Promise<string> {
  await onboard(page, '31');
  await page.waitForURL((url) => url.pathname === '/');
  await become(page, /Marc/);
  await page.goto('/search');
  await page.getByLabel('What do you want to do?').fill('kayak');
  await page.getByLabel('Search a city').fill('Ajaccio');
  await page.getByRole('button', { name: /Ajaccio/ }).first().click();
  await page.getByRole('button', { name: 'Tue 18 Aug afternoon: not free' }).click();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  await page.getByRole('link', { name: 'View your proposal' }).click();
  await expect(page).toHaveURL(/\/signals\/sig-p-/);
  return new URL(page.url()).pathname;
}

test('a volunteer offers, the proposer confirms, the host is shown, and an eligible adult joins', async ({ page }) => {
  const url = await proposeAsMarc(page);
  await expect(page.getByText('Proposal · no host yet')).toBeVisible();
  await expect(page.getByText('Nobody has offered to host yet.')).toBeVisible();

  // Léa offers: her explicit consent. Nothing is designated yet.
  await become(page, /Léa/);
  await page.goto(url);
  await expect(page.getByText(/no host yet, so nobody can join/)).toBeVisible();
  await page.getByRole('button', { name: 'Offer to host' }).click();
  await expect(page.getByText(/You offered to host this\. Marc decides/)).toBeVisible();
  await expect(page.getByText('Proposal · no host yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Offer to host' })).toHaveCount(0);

  // Marc confirms that same person: the proposer's confirmation.
  await become(page, /Marc/);
  await page.goto(url);
  await page.getByRole('button', { name: 'Confirm Léa as host' }).click();
  await expect(page.getByRole('heading', { name: 'Hosted by Léa' })).toBeVisible();
  await expect(page.getByText('Proposal · hosted')).toBeVisible();
  await expect(page.getByText(/You proposed this\. Léa hosts it/)).toBeVisible();
  // Same activity, still candidate windows, no host controls for the proposer.
  await expect(page).toHaveURL(new RegExp(`${url}$`));
  await expect(page.getByText('Possible times')).toBeVisible();
  await expect(page.getByText('Tue 12:00–18:00')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close it to new people' })).toHaveCount(0);

  // Hugo, an eligible adult, sees who hosts it and joins through the existing flow.
  await become(page, /Hugo/);
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Hosted by Léa' })).toBeVisible();
  await page.getByRole('button', { name: 'Join', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'You are on the list' })).toBeVisible();

  // Léa, the designated host, now holds the host controls and sees Hugo.
  await become(page, /Léa/);
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Who is coming' })).toBeVisible();
  await expect(page.getByText('Hugo').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Close it to new people' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join', exact: true })).toHaveCount(0);

  // And Marc, the proposer, still has none of them.
  await become(page, /Marc/);
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Close it to new people' })).toHaveCount(0);
});

test('once Léa hosts, Marc can join his own proposal explicitly, once, with no host controls', async ({ page }) => {
  const url = await proposeAsMarc(page);
  await become(page, /Léa/);
  await page.goto(url);
  await page.getByRole('button', { name: 'Offer to host' }).click();
  await expect(page.getByText(/You offered to host this/)).toBeVisible();

  await become(page, /Marc/);
  await page.goto(url);
  await page.getByRole('button', { name: 'Confirm Léa as host' }).click();
  await expect(page.getByRole('heading', { name: 'Hosted by Léa' })).toBeVisible();
  // Confirming joined nobody: Marc is offered the ordinary action, not put on the list.
  await expect(page.getByText(/You are not on the list unless you join/)).toBeVisible();

  const joins = { count: 0 };
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `/api${url}/join`) joins.count += 1;
  });
  await page.getByRole('button', { name: 'Join', exact: true }).click();
  // Joined reads as a status, not as a disabled button.
  await expect(page.getByRole('status').filter({ hasText: 'You are on the list' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'You are on the list' })).toHaveCount(0);
  expect(joins.count).toBe(1);
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Close it to new people' })).toHaveCount(0);

  // After a reload, still joined once and still no host controls.
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'You are on the list' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Who is coming' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Marc', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0);

  // Léa, the host, sees Marc on her list.
  await become(page, /Léa/);
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(1);
});

test('people who cannot host are told why, and cannot offer', async ({ page }) => {
  const url = await proposeAsMarc(page);

  // A minor: hosting stays adults-only.
  await become(page, /Inès/);
  await page.goto(url);
  await expect(page.getByText(/You cannot offer to host it/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Offer to host' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Join', exact: true })).toHaveCount(0);

  // An adult without a local tie to Ajaccio.
  await become(page, /Tom/);
  await page.goto(url);
  await expect(page.getByText(/You cannot offer to host it/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Offer to host' })).toHaveCount(0);

  // The proposer is never offered to host their own proposal.
  await become(page, /Marc/);
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'Offer to host' })).toHaveCount(0);
});

test('an existing hosted signal shows no host-designation controls', async ({ page }) => {
  await onboard(page, '31');
  await page.waitForURL((url) => url.pathname === '/');
  await become(page, /Hugo/);
  await page.goto('/signals/sig-ajaccio-event');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Offer to host' })).toHaveCount(0);
  await expect(page.getByText(/Hosted by/)).toHaveCount(0);
  await expect(page.getByText(/Proposal ·/)).toHaveCount(0);
});
