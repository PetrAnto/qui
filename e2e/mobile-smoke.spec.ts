import { expect, test, type Page } from '@playwright/test';

/**
 * The product loop, on a phone.
 *
 * This walks the path a real person takes — age gate, first city, what they do,
 * then look, appreciate, switch city, answer a signal — and asserts the safety
 * rules where they bite rather than only the happy path. Everything it touches
 * is a real write through the real policy layer; nothing is stubbed.
 *
 * The demo store lives in the server process, but Playwright creates an isolated
 * browser context for every test. Authenticated tests therefore onboard their
 * own synthetic viewer instead of depending on another test's cookie.
 */

const AJACCIO = 'geo:city:ajaccio';
const KILRUSH = 'geo:city:kilrush';

async function onboard(page: Page, age: string): Promise<void> {
  await page.goto('/welcome');
  await page.getByLabel('Your age').fill(age);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('City').selectOption(AJACCIO);
  await page.getByLabel('What is it to you?').selectOption('resident');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('I practise… (comma separated)').fill('bike repair, freediving');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Take me in' }).click();
}

test.describe.configure({ mode: 'serial' });

test('the demo says what it is, on every screen', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByText('Demo build — every person and post here is invented')).toBeVisible();
});

test('refuses an account below the age baseline, and says so', async ({ page }) => {
  await onboard(page, '14');
  await expect(page.getByText('You are below the minimum age for this product.')).toBeVisible();
  // Still on the age step, still no session.
  await expect(page.getByRole('heading', { name: 'How old are you?' })).toBeVisible();
});

test('takes an eligible person through onboarding into Discover', async ({ page }) => {
  await onboard(page, '31');
  await expect(page.getByRole('heading', { name: 'What people here actually do' })).toBeVisible();
  await expect(page.getByText('Ajaccio', { exact: true })).toBeVisible();
});

test('the tab bar is reachable with a thumb and marks where you are', async ({ page }) => {
  await onboard(page, '31');
  const tabs = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
  await expect(tabs).toHaveCount(5);

  const box = await tabs.first().boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  // Nothing overflows the phone viewport.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('a card can be appreciated, and explains why it is in the feed', async ({ page }) => {
  await onboard(page, '31');
  const first = page.locator('article.card').first();
  await expect(first).toBeVisible();

  const heart = first.getByRole('button', { name: /♥/ });
  const before = await heart.textContent();
  await heart.click();
  await expect(heart).not.toHaveText(before ?? '');

  await first.getByText('Why am I seeing this?').click();
  await expect(first.getByText('geography')).toBeVisible();
});

test('any city can be switched to, with no permission and no evidence', async ({ page }) => {
  await onboard(page, '31');
  await page.getByRole('button', { name: 'Change city' }).click();
  await page.getByLabel('Search any city').fill('kilrush');
  await page.getByRole('button', { name: /Kilrush/ }).click();

  await expect(page.getByText('Kilrush', { exact: true })).toBeVisible();
  await page.goto('/signals');
  await expect(page.getByRole('heading', { name: 'Signals in Kilrush' })).toBeVisible();
});

test('publishing as a local is refused where there is no tie', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/places');
  await page.getByLabel('What is it to you?').selectOption('exploring');
  await page.getByLabel('Search').fill('kilrush');
  await page.getByRole('button', { name: /Kilrush/ }).click();
  await expect(page.getByText('Added.')).toBeVisible();

  await page.goto('/publish');
  await page.getByLabel('City').selectOption(KILRUSH);
  await expect(page.getByText(/publishing there as a local needs a real tie/i)).toBeVisible();

  await page.getByLabel('What happened').fill('Trying to post somewhere I have never been.');
  await page.getByRole('button', { name: 'Post it' }).click();
  await expect(page.getByText('Add a real tie to this place before publishing here.')).toBeVisible();
});

test('answering a signal is the only way to reach somebody', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/threads');
  await expect(page.getByRole('heading', { name: 'Threads' })).toBeVisible();
  // There is no compose control anywhere on the threads surface.
  await expect(page.getByRole('button', { name: /new message|compose/i })).toHaveCount(0);

  await page.goto('/signals');
  const openSignal = page.getByRole('link', { name: 'Open' }).first();
  await expect(openSignal).toBeVisible();
  await openSignal.click();

  await expect(page.getByRole('heading').first()).toBeVisible();
});

test('a profile carries evidence, never a score', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/p/demo-lea');
  await expect(page.getByRole('heading', { name: 'Léa', exact: true })).toBeVisible();
  await expect(page.getByText('tie to this place')).toBeVisible();
  await expect(page.getByText(/trust score|level \d|rating/i)).toHaveCount(0);
});

test('report and block are on the content, and explain themselves', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/p/demo-lea');
  await page.getByRole('button', { name: 'Report or block' }).click();
  await expect(page.getByText(/A block works in both directions/)).toBeVisible();
  await page.getByRole('button', { name: 'Send to moderation' }).click();
  await expect(page.getByText(/they will never know it was you/)).toBeVisible();
});

test('the internal insights view ranks conversion above volume', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'Where is this working?' })).toBeVisible();

  const cities = await page.locator('table.table').first().locator('tbody tr td:first-child').allTextContents();
  expect(cities.findIndex((row) => row.includes('Ajaccio'))).toBeLessThan(
    cities.findIndex((row) => row.includes('Paris')),
  );
});

test('switching persona is offered honestly, not hidden', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/me');
  await expect(page.getByRole('heading', { name: 'Be somebody else' })).toBeVisible();
  await expect(page.getByText(/off — demo personas only/)).toBeVisible();

  await page.getByRole('button', { name: /Inès/ }).click();
  await expect(page.getByRole('heading', { name: 'What people here actually do' })).toBeVisible();
});

test('a minor does not appear in people discovery for an adult', async ({ page }) => {
  await onboard(page, '31');
  await page.goto('/me');
  await page.getByRole('button', { name: /Hugo/ }).click();
  await page.goto('/people');
  await expect(page.getByRole('heading', { name: /People in/ })).toBeVisible();
  await expect(page.getByText('@demo-ines')).toHaveCount(0);
});

test('keyboard users can skip to main and reach primary controls', async ({ page }) => {
  await page.goto('/welcome');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();

  await onboard(page, '31');
  await page.goto('/');
  // Tab bar is a landmark with named links — keyboard, not only tap.
  const discover = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Discover/i });
  await discover.focus();
  await expect(discover).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/$/);
});

test('reduced-motion preference is honoured in CSS', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/welcome');
  const transition = await page.locator('.skip-link').evaluate((el) => getComputedStyle(el).transitionDuration);
  // prefers-reduced-motion zeroes transitions; browsers report "0s".
  expect(transition === '0s' || transition === '0ms').toBe(true);
});
