import { expect, test, type Page } from '@playwright/test';

import { onboard } from './helpers';

/**
 * Regression tests for the city-selection state defect (#30).
 *
 * Three root causes were reproduced on main:
 *
 *  1. Onboarding kept the selected city object when the visible query was
 *     edited afterwards, so Continue could submit a place the person was no
 *     longer looking at.
 *  2. Both city search fields applied whichever /api/cities response arrived
 *     last, so a slow answer to an older query overwrote newer results.
 *  3. A response already in flight at selection (or field clearing) time
 *     repopulated the results list afterwards.
 *
 * The races are made deterministic by holding specific HTTP responses at the
 * network layer until the newer query has completed.
 */

const RESULTS = '.searchresults';

/** Reach the place step of onboarding with a synthetic eligible age. */
async function reachPlaceStep(page: Page): Promise<void> {
  await page.goto('/welcome');
  await page.getByLabel('Your age').fill('31');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Where are you?' })).toBeVisible();
}

interface HeldRequest {
  /** Resolves once the matching request has been intercepted and paused. */
  readonly held: Promise<void>;
  /** Lets the paused request through to the real server. */
  release(): void;
}

/**
 * Pause the /api/cities response for exactly one query string. Every other
 * query passes through untouched. This is how the test controls which response
 * arrives last, instead of hoping latency cooperates.
 */
async function holdCityQuery(page: Page, heldQuery: string): Promise<HeldRequest> {
  let markHeld: () => void = () => undefined;
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    markHeld = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/cities?*', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q');
    if (query === heldQuery) {
      markHeld();
      await gate;
    }
    await route.continue();
  });
  return { held, release };
}

/** Wait for the actual held response to come back after release. */
function cityResponse(page: Page, query: string): Promise<unknown> {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/cities') &&
      new URL(response.url()).searchParams.get('q') === query,
  );
}

test.describe.configure({ mode: 'serial' });


test('selecting, editing and reselecting keeps the form honest', async ({ page }) => {
  await reachPlaceStep(page);
  const city = page.getByLabel('City');
  const continueButton = page.getByRole('button', { name: 'Continue' });

  await expect(continueButton).toBeDisabled();

  await city.fill('Ajaccio');
  await page.getByRole('button', { name: /Ajaccio/ }).first().click();
  await expect(page.getByText(/Selected: Ajaccio/)).toBeVisible();
  await expect(continueButton).toBeEnabled();

  // Editing the visible text away from the selection un-selects it.
  await city.fill('Ajacci');
  await expect(page.getByText(/Selected:/)).toHaveCount(0);
  await expect(continueButton).toBeDisabled();

  // Reselecting a different city re-enables Continue with the new choice.
  await city.fill('Kilrush');
  await page.getByRole('button', { name: /Kilrush/ }).first().click();
  await expect(page.getByText(/Selected: Kilrush/)).toBeVisible();
  await expect(continueButton).toBeEnabled();
});

test('a slow older search never overwrites newer results in onboarding', async ({ page }) => {
  await reachPlaceStep(page);
  const city = page.getByLabel('City');
  const stale = await holdCityQuery(page, 'aj');

  await city.fill('aj');
  await stale.held;

  await city.fill('tokyo');
  const results = page.locator(RESULTS);
  await expect(results.getByRole('button', { name: /Tokyo/ }).first()).toBeVisible();

  const staleResponse = cityResponse(page, 'aj');
  stale.release();
  await staleResponse;
  // Let any (buggy) stale state update flush before asserting it did not land.
  await page.waitForTimeout(150);
  await expect(results.getByRole('button', { name: /Ajaccio/ })).toHaveCount(0);
  await expect(results.getByRole('button', { name: /Tokyo/ }).first()).toBeVisible();
});

test('clearing the field cannot be undone by a late response', async ({ page }) => {
  await reachPlaceStep(page);
  const city = page.getByLabel('City');
  const stale = await holdCityQuery(page, 'aj');

  await city.fill('aj');
  await stale.held;

  await city.fill('');
  await expect(page.locator(RESULTS).getByRole('button')).toHaveCount(0);

  const staleResponse = cityResponse(page, 'aj');
  stale.release();
  await staleResponse;
  await page.waitForTimeout(150);
  await expect(page.locator(RESULTS).getByRole('button')).toHaveCount(0);
});

test('choosing a result while a search is in flight does not reopen the list', async ({
  page,
}) => {
  await reachPlaceStep(page);
  const city = page.getByLabel('City');
  const stale = await holdCityQuery(page, 'par');

  await city.fill('paris');
  const results = page.locator(RESULTS);
  const paris = results.getByRole('button', { name: /Paris/ }).first();
  await expect(paris).toBeVisible();

  // Start a newer search, hold it, and pick from the still-visible results.
  await city.fill('par');
  await stale.held;
  await paris.click();
  await expect(page.getByText(/Selected: Paris/)).toBeVisible();
  await expect(results.getByRole('button')).toHaveCount(0);

  const staleResponse = cityResponse(page, 'par');
  stale.release();
  await staleResponse;
  await page.waitForTimeout(150);
  await expect(results.getByRole('button')).toHaveCount(0);
  await expect(page.getByText(/Selected: Paris/)).toBeVisible();
});

test('the city switcher applies only the latest search and persists across reload', async ({
  page,
}) => {
  await onboard(page, '31');
  await page.getByRole('button', { name: 'Change city' }).click();
  const input = page.getByLabel('Search any city');

  const stale = await holdCityQuery(page, 'aj');
  await input.fill('aj');
  await stale.held;

  await input.fill('kilrush');
  const results = page.locator(RESULTS);
  await expect(results.getByRole('button', { name: /Kilrush/ })).toBeVisible();

  const staleResponse = cityResponse(page, 'aj');
  stale.release();
  await staleResponse;
  await page.waitForTimeout(150);
  await expect(results.getByRole('button', { name: /Ajaccio/ })).toHaveCount(0);
  await expect(results.getByRole('button', { name: /Kilrush/ })).toBeVisible();

  await results.getByRole('button', { name: /Kilrush/ }).click();
  await expect(page.locator('.citybar__name')).toHaveText('Kilrush');

  // The choice is a cookie, so a full reload lands on the same city.
  await page.reload();
  await expect(page.locator('.citybar__name')).toHaveText('Kilrush');
});
