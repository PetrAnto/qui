import { expect, test, type Page } from '@playwright/test';

import { onboard } from './helpers';

/**
 * Search → preview → one explicit Publish → the activity exists (ADR-0016).
 *
 * The onboarded persona has a tie to Ajaccio only. The demo clock reads
 * Sunday 16 August 2026. A practice nobody seeded ("kayak") guarantees there
 * is no prior match.
 */

test.describe.configure({ mode: 'serial' });

/** Onboard, then wait until the session exists (onboarding lands on Discover). */
async function signIn(page: Page): Promise<void> {
  await onboard(page, '31');
  await page.waitForURL((url) => url.pathname === '/');
}

async function fillSearch(page: Page, practice: string, city: string): Promise<void> {
  await page.goto('/search');
  await page.getByLabel('What do you want to do?').fill(practice);
  await page.getByLabel('Search a city').fill(city);
  await page.getByRole('button', { name: new RegExp(city) }).first().click();
  await expect(page.getByText(`City: ${city}`)).toBeVisible();
  await page.getByRole('button', { name: 'Tue 18 Aug afternoon: not free' }).click();
  const wed = page.getByRole('button', { name: 'Wed 19 Aug morning: not free' });
  await wed.click();
  await page.getByRole('button', { name: 'Wed 19 Aug morning: available' }).click();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
}

function countPublications(page: Page): { count: number } {
  const counter = { count: 0 };
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/activities/proposals') {
      counter.count += 1;
    }
  });
  return counter;
}

test('publishes the proposal a search became, once, and it can then be found', async ({ page }) => {
  await signIn(page);
  await fillSearch(page, 'kayak', 'Ajaccio');
  await expect(page.getByText('No matching activity found for these criteria in Ajaccio.')).toBeVisible();

  const publications = countPublications(page);
  const publish = page.getByRole('button', { name: 'Publish this proposal' });
  await publish.dblclick();
  await expect(page.getByText(/^Published\. People looking for this in Ajaccio can now find it\./)).toBeVisible();
  expect(publications.count).toBeLessThanOrEqual(2);

  await page.getByRole('link', { name: 'View your proposal' }).click();
  await expect(page).toHaveURL(/\/signals\/sig-p-/);
  await expect(page.getByRole('heading', { name: 'kayak in Ajaccio' })).toBeVisible();
  await expect(page.getByText('Proposal · no host yet')).toBeVisible();
  // Candidate windows, not an appointment; the preference survives.
  await expect(page.getByText('Possible times')).toBeVisible();
  await expect(page.getByText('Tue 12:00–18:00')).toBeVisible();
  await expect(page.getByText('Wed 08:00–12:00 ★ preferred')).toBeVisible();
  await expect(page.getByText(/Your proposal\. It has no host yet/)).toBeVisible();
  // No joining path, no host controls.
  await expect(page.getByRole('button', { name: /join/i })).toHaveCount(0);

  // Discoverable in Signals — exactly once, whatever the double click did.
  await page.goto('/signals');
  await expect(page.getByRole('heading', { name: 'kayak in Ajaccio' })).toHaveCount(1);

  // Searchable through the matcher, and a new search keeps the published state.
  await page.goto('/search');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Open activities' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'kayak in Ajaccio' })).toBeVisible();
  await expect(page.getByText('Fits your search')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toBeVisible();
});

test('refuses publication in a city with no tie, keeps the draft, and creates nothing', async ({ page }) => {
  await signIn(page);
  await fillSearch(page, 'kayak', 'Lyon');
  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  await expect(
    page.getByText('Add this city to your places first — exploring it is enough to propose here.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toHaveCount(0);
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('kayak');
  await expect(page.getByText('City: Lyon')).toBeVisible();
});

test('recovers from a failed publication without creating a duplicate', async ({ page }) => {
  await signIn(page);
  await fillSearch(page, 'canyoning', 'Ajaccio');

  let failures = 1;
  await page.route('**/api/activities/proposals', async (route) => {
    if (failures > 0) {
      failures -= 1;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  const publish = page.getByRole('button', { name: 'Publish this proposal' });
  await publish.click();
  await expect(page.getByText(/Publishing did not complete/)).toBeVisible();
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('canyoning');
  await publish.click();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toBeVisible();

  await page.goto('/signals');
  await expect(page.getByRole('heading', { name: 'canyoning in Ajaccio' })).toHaveCount(1);
});
