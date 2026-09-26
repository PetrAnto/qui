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

/** Counts search requests actually sent to the server. */
function countSearches(page: Page): { count: number } {
  const counter = { count: 0 };
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/activities/search') counter.count += 1;
  });
  return counter;
}

async function chooseCity(page: Page, name: string): Promise<void> {
  await page.getByLabel('Search a city').fill(name);
  await page.getByRole('button', { name: new RegExp(name) }).first().click();
  await expect(page.getByText(`City: ${name}`)).toBeVisible();
}

test('keeps a search through the demo sign-in, then shows what is open', async ({ page }) => {
  const writes = watchForWrites(page);
  const searches = countSearches(page);

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
  // The one resumed search — and only one, even after a reload.
  expect(searches.count).toBe(1);
  await page.reload();
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('climbing');
  await page.waitForLoadState('networkidle');
  expect(searches.count).toBe(1);
  await expect(page.getByRole('heading', { name: 'Open activities' })).toHaveCount(0);

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
  await page.getByLabel('Cost').selectOption('prefer');

  await page.getByRole('button', { name: 'Search', exact: true }).click();
  // An empty filtered result is not proof that nobody proposed it.
  await expect(page.getByText('No matching activity found for these criteria in Montpellier.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'padel in Montpellier' })).toBeVisible();
  await expect(page.getByText('Wed 18:00–22:00 ★ preferred')).toBeVisible();
  await expect(page.getByText('Level: intermediate — required')).toBeVisible();
  // A preference for free is not a confirmed free cost; no equipment data is not "no equipment".
  await expect(page.getByText('Cost: free preferred, not confirmed.')).toBeVisible();
  await expect(page.getByText('Equipment: not specified.')).toBeVisible();
  await expect(page.getByText('Publishing is not available in this demo.')).toBeVisible();
  await expect(page.getByText(/owner decision/i)).toHaveCount(0);

  expect(writes).toEqual([]);
});

test('is reachable from Signals', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/signals');
  await page.getByRole('link', { name: 'Find something to do' }).click();
  await expect(page).toHaveURL(/\/search$/);
});

test('recovers from a stored draft whose time zone is not real', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      'qui.activity-search.draft.v1',
      JSON.stringify({
        v: 1,
        practice: 'climbing',
        city: { id: 'geo:city:lyon', name: 'Lyon', timezone: 'Invalid/Zone' },
        slots: [{ date: '2026-08-18', part: 'afternoon', preferred: false }],
        durationMinutes: 90,
        level: null,
        freeOnly: null,
      }),
    );
  });
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: 'Find something to do' })).toBeVisible();
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('recovers from a failed search, keeps the draft, and a retry works', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/search');
  await page.getByLabel('What do you want to do?').fill('climbing');
  await chooseCity(page, 'Lyon');
  await page.getByRole('button', { name: 'Tue 18 Aug afternoon: not free' }).click();

  let mode: 'fail' | 'hold' | 'pass' = 'fail';
  let release: () => void = () => undefined;
  await page.route('**/api/activities/search', async (route) => {
    if (mode === 'fail') {
      await route.abort('failed');
      return;
    }
    if (mode === 'hold') await new Promise<void>((resolve) => (release = resolve));
    await route.continue();
  });

  const search = page.getByRole('button', { name: 'Search', exact: true });
  await search.click();
  await expect(page.getByText('The search could not be completed. Check your connection and try again — your search is kept.')).toBeVisible();
  await expect(search).toBeEnabled();
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('climbing');

  mode = 'pass';
  await search.click();
  await expect(page.getByText('Needs confirmation')).toBeVisible();

  // A replacement request clears the results of the previous query while it runs.
  mode = 'hold';
  await page.getByLabel('What do you want to do?').fill('bouldering');
  await search.click();
  await expect(page.getByText('Needs confirmation')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'climbing in Lyon' })).toHaveCount(0);
  release();
  await expect(page.getByRole('heading', { name: 'bouldering in Lyon' })).toBeVisible();
  await expect(page.getByText('No matching activity found for these criteria in Lyon.')).toBeVisible();
});

test('an ordinary visit restores a saved draft without sending it', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/search');
  await page.getByLabel('What do you want to do?').fill('climbing');
  await chooseCity(page, 'Lyon');
  await page.getByRole('button', { name: 'Tue 18 Aug afternoon: not free' }).click();

  const searches = countSearches(page);
  await page.reload();
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('climbing');
  await page.goto('/signals');
  await page.getByRole('link', { name: 'Find something to do' }).click();
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('climbing');
  await page.waitForLoadState('networkidle');
  expect(searches.count).toBe(0);
  await expect(page.getByRole('heading', { name: 'Open activities' })).toHaveCount(0);
});

test('an abandoned sign-in does not fire the search later', async ({ page }) => {
  await page.goto('/search');
  await page.getByLabel('What do you want to do?').fill('climbing');
  await chooseCity(page, 'Lyon');
  await page.getByRole('button', { name: 'Tue 18 Aug afternoon: not free' }).click();
  await page.getByRole('button', { name: 'Show my proposal' }).click();
  await page.getByRole('button', { name: 'Continue with demo access' }).click();
  await expect(page).toHaveURL(/\/welcome/);

  // The person comes back to the search instead of finishing — then signs in later, separately.
  await page.goto('/search');
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('climbing');
  const searches = countSearches(page);
  await onboard(page, '31');
  await expect(page).not.toHaveURL(/\/search$/);
  await page.goto('/search');
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('climbing');
  await page.waitForLoadState('networkidle');
  expect(searches.count).toBe(0);
});

test('city suggestions never outlive the text they answered', async ({ page }) => {
  await page.goto('/search');
  const input = page.getByLabel('Search a city');

  let hold: (() => void) | null = null;
  await page.route('**/api/cities?q=*', async (route) => {
    const q = new URL(route.request().url()).searchParams.get('q') ?? '';
    if (q === 'Lyon' && hold === null) {
      await new Promise<void>((resolve) => (hold = resolve));
    }
    await route.continue();
  });

  // Replaced text clears the old rows at once.
  await input.fill('Montpellier');
  await expect(page.getByRole('button', { name: /Montpellier/ }).first()).toBeVisible();
  await input.fill('Lyon');
  await expect(page.getByRole('button', { name: /Montpellier/ })).toHaveCount(0);

  // A newer query answers first; the held, older one must not come back.
  await input.fill('Marseille');
  await expect(page.getByRole('button', { name: /Marseille/ }).first()).toBeVisible();
  (hold as (() => void) | null)?.();
  await page.waitForTimeout(300);
  await expect(page.getByRole('button', { name: /^Lyon/ })).toHaveCount(0);
});

test('recovers from a failed city lookup', async ({ page }) => {
  await page.goto('/search');
  let failures = 1;
  await page.route('**/api/cities?q=*', async (route) => {
    if (failures > 0) {
      failures -= 1;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.getByLabel('Search a city').fill('Lyon');
  await expect(page.getByText('Could not look up cities. Check your connection and try again.')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('button', { name: /Lyon/ }).first().click();
  await expect(page.getByText('City: Lyon')).toBeVisible();
  expect(errors).toEqual([]);
});
