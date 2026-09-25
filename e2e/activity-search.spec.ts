import { expect, test, type Page } from '@playwright/test';

import { onboard } from './helpers';

/**
 * Activity search → results → proposal preview, on a phone.
 *
 * The demo clock reads Sunday 16 August 2026, so the day picker offers that
 * week. Every seeded activity has a start time but no end time, so the honest
 * best result is "Needs confirmation", never "Fits your search".
 */

test.describe.configure({ mode: 'serial' });

/** Any request that could publish, join, respond or record an outcome. */
function watchForWrites(page: Page): string[] {
  const writes: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' || !url.pathname.startsWith('/api/')) return;
    const allowed = ['/api/activities/search', '/api/onboarding', '/api/session'];
    if (!allowed.includes(url.pathname)) writes.push(`${request.method()} ${url.pathname}`);
  });
  return writes;
}

async function chooseCity(page: Page, name: string): Promise<void> {
  await page.getByLabel('Search a city').fill(name);
  await page.getByRole('button', { name: new RegExp(name) }).first().click();
  await expect(page.getByText(`City: ${name}`)).toBeVisible();
}

test('keeps a search through the demo sign-in, then shows what is open', async ({ page }) => {
  const writes = watchForWrites(page);

  await page.goto('/search');
  await expect(page.getByRole('heading', { name: 'Find something to do' })).toBeVisible();
  await page.getByLabel('What do you want to do?').fill('climbing');
  await chooseCity(page, 'Lyon');
  await page.getByRole('button', { name: 'Tue 18 Aug afternoon: not free' }).click();
  await expect(page.getByRole('button', { name: 'Tue 18 Aug afternoon: available' })).toBeVisible();

  // Without a session: the proposal preview, and no results from anybody.
  await page.getByRole('button', { name: 'Show my proposal' }).click();
  await expect(page.getByRole('heading', { name: 'climbing in Lyon' })).toBeVisible();
  await expect(page.getByText('Preview — not published')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open activities' })).toHaveCount(0);

  // Nothing was put in the address bar.
  expect(page.url()).not.toContain('climbing');

  // A reload keeps the draft in this tab.
  await page.reload();
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('climbing');
  await expect(page.getByText('City: Lyon')).toBeVisible();
  await page.getByRole('button', { name: 'Show my proposal' }).click();

  await page.getByRole('button', { name: 'Continue with demo access' }).click();
  await expect(page).toHaveURL(/\/welcome/);
  await onboard(page, '31');

  // Back where the person was, with every input intact, and the search already run.
  await expect(page).toHaveURL(/\/search$/);
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('climbing');
  await expect(page.getByText('City: Lyon')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tue 18 Aug afternoon: available' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open activities' })).toBeVisible();
  await expect(page.getByText('Needs confirmation')).toBeVisible();
  await expect(page.getByText('Starts Tue 16:00; end time not given')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'climbing in Lyon' })).toBeVisible();

  expect(writes).toEqual([]);
});

test('with nothing open, still offers the proposal the search would become', async ({ page }) => {
  await onboard(page, '31');
  const writes = watchForWrites(page);

  await page.goto('/search');
  await page.getByLabel('What do you want to do?').fill('padel');
  await chooseCity(page, 'Montpellier');
  const slot = page.getByRole('button', { name: /^Wed 19 Aug evening:/ });
  await slot.click();
  await slot.click();
  await expect(page.getByRole('button', { name: 'Wed 19 Aug evening: preferred' })).toBeVisible();
  await page.getByLabel('Level').selectOption('intermediate:must');

  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('Nobody has proposed padel in Montpellier for those times yet.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'padel in Montpellier' })).toBeVisible();
  await expect(page.getByText('Wed 18:00–22:00 ★ preferred')).toBeVisible();
  await expect(page.getByText('Level: intermediate — required')).toBeVisible();
  await expect(page.getByText('Nothing has been published or joined.')).toBeVisible();

  expect(writes).toEqual([]);
});

test('is reachable from Signals', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/signals');
  await page.getByRole('link', { name: 'Find something to do' }).click();
  await expect(page).toHaveURL(/\/search$/);
});
