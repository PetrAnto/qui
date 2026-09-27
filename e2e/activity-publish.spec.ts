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

test('another persona with identical criteria sees an unpublished preview and publishes independently', async ({
  page,
}) => {
  await signIn(page); // the demo gives this adult persona: Léa
  await fillSearch(page, 'rafting', 'Ajaccio');
  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  const first = page.getByRole('link', { name: 'View your proposal' });
  await expect(first).toBeVisible();
  const firstHref = await first.getAttribute('href');

  // Switch to another adult persona tied to Ajaccio, in the same tab.
  await page.goto('/me');
  await page.getByRole('button', { name: /^Marc/ }).click();
  await page.waitForURL((url) => url.pathname === '/');

  await page.goto('/search');
  await expect(page.getByLabel('What do you want to do?')).toHaveValue('rafting');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  // Léa's proposal is found among the results; the preview below is Marc's own, unpublished.
  await expect(page.locator('#preview-title')).toHaveText('rafting in Ajaccio');
  await expect(page.getByText('Preview — not published')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  const second = page.getByRole('link', { name: 'View your proposal' });
  await expect(second).toBeVisible();
  expect(await second.getAttribute('href')).not.toBe(firstHref);

  await page.goto('/signals');
  await expect(page.getByRole('heading', { name: 'rafting in Ajaccio' })).toHaveCount(2);
});

/** Every proposalKey the page sends, in order. */
function proposalKeys(page: Page): string[] {
  const keys: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/activities/proposals') {
      keys.push(String((request.postDataJSON() as { proposalKey?: string }).proposalKey));
    }
  });
  return keys;
}

async function searchFor(page: Page, practice: string): Promise<void> {
  await page.getByLabel('What do you want to do?').fill(practice);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
}

test('A → B → A, and after a reload: A is still A, with no duplicate', async ({ page }) => {
  await signIn(page);
  await fillSearch(page, 'sailing', 'Ajaccio');
  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  const hrefA = await page.getByRole('link', { name: 'View your proposal' }).getAttribute('href');

  await searchFor(page, 'rowing');
  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toBeVisible();

  const keys = proposalKeys(page);
  await searchFor(page, 'sailing');
  await expect(page.getByRole('link', { name: 'View your proposal' })).toHaveAttribute('href', hrefA ?? '');
  await expect(page.getByRole('button', { name: 'Publish this proposal' })).toHaveCount(0);

  await page.reload();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toHaveAttribute('href', hrefA ?? '');
  expect(keys).toEqual([]);

  await page.goto('/signals');
  await expect(page.getByRole('heading', { name: 'sailing in Ajaccio' })).toHaveCount(1);
});

test('a lost response for A, then B, then retrying A reuses A’s original key', async ({ page }) => {
  await signIn(page);
  await fillSearch(page, 'surfing', 'Ajaccio');
  const keys = proposalKeys(page);

  let lose = true;
  await page.route('**/api/activities/proposals', async (route) => {
    if (lose) {
      lose = false;
      await route.fetch(); // the server creates it…
      await route.abort('failed'); // …but the browser never hears back
      return;
    }
    await route.continue();
  });

  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  await expect(page.getByText(/Publishing did not complete/)).toBeVisible();

  await searchFor(page, 'diving');
  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toBeVisible();

  await searchFor(page, 'surfing');
  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toBeVisible();

  expect(keys).toHaveLength(3);
  expect(keys[2]).toBe(keys[0]);
  expect(keys[1]).not.toBe(keys[0]);
  await page.goto('/signals');
  await expect(page.getByRole('heading', { name: 'surfing in Ajaccio' })).toHaveCount(1);
});

test('after a demo-store reset, the kept key allows an explicit recovery', async ({ page }) => {
  await signIn(page);
  await fillSearch(page, 'snorkelling', 'Ajaccio');
  const keys = proposalKeys(page);
  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toBeVisible();

  // The server forgets it (as an isolate restart would); the tab keeps its record.
  await page.route('**/api/signals/sig-p-*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{"reason":"not_found"}' });
  });

  // While the page stays open, a check is always available…
  await page.getByRole('button', { name: 'Check it is still published' }).click();
  await expect(page.getByText(/no longer in the demo/)).toBeVisible();
  // …and after a reload, restoration verifies before claiming anything.
  await page.reload();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText(/no longer in the demo/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toHaveCount(0);
  expect(keys).toHaveLength(1); // nothing was published automatically

  await page.unroute('**/api/signals/sig-p-*');
  await page.getByRole('button', { name: 'Publish it again' }).click();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
});

test('a failed verification keeps the key, says so, and never publishes on its own', async ({ page }) => {
  await signIn(page);
  await fillSearch(page, 'windsurfing', 'Ajaccio');
  const keys = proposalKeys(page);
  await page.getByRole('button', { name: 'Publish this proposal' }).click();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toBeVisible();

  await page.route('**/api/signals/sig-p-*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.abort('failed');
  });
  await page.reload();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('Could not check whether this proposal is still published.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish this proposal' })).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(keys).toHaveLength(1);

  await page.unroute('**/api/signals/sig-p-*');
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(page.getByRole('link', { name: 'View your proposal' })).toBeVisible();
  expect(keys).toHaveLength(1);
});
