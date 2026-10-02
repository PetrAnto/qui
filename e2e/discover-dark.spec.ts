import { expect, test } from '@playwright/test';

/**
 * A fresh visitor reaches the owner-approved dark Discover preview through the
 * ordinary demo entry (docs/design/DISCOVER_DARK_PREVIEW.md). The entry keeps
 * the dark choice; nothing else turns dark.
 */
test('a fresh visitor enters the demo and lands on the dark Discover', async ({ page }) => {
  await page.goto('/?theme=dark');
  await expect(page).toHaveURL(/\/welcome\?theme=dark$/);

  await page.getByLabel('Your age').fill('31');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('City').fill('Ajaccio');
  await page.getByRole('button', { name: /Ajaccio/ }).first().click();
  await page.getByLabel('What is it to you?').selectOption('resident');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('I practise… (comma separated)').fill('bike repair, freediving');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Take me in' }).click();

  await page.waitForURL((url) => url.pathname === '/' && url.search === '?theme=dark');
  await expect(page.locator('.discover-dark')).toBeVisible();
  await expect(page.getByText(/Demo build/).first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('What people here');
  await expect(page.locator('.dd-feed article').first()).toBeVisible();

  // A representative action: "Why am I seeing this?" opens on the first card.
  const why = page.locator('.dd-feed details.why').first();
  await why.locator('summary').click();
  await expect(why).toHaveAttribute('open', '');

  // Other screens stay light.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Signals/ }).click();
  await expect(page).toHaveURL(/\/signals$/);
  await expect(page.locator('.discover-dark')).toHaveCount(0);

  // And the light Discover is one link away from the dark one.
  await page.goto('/?theme=dark');
  await page.getByRole('link', { name: 'Switch to light' }).click();
  await page.waitForURL((url) => url.pathname === '/' && url.search === '');
  await expect(page.locator('.discover-dark')).toHaveCount(0);
});
