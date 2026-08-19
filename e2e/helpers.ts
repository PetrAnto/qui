import type { Page } from '@playwright/test';

/**
 * Walk the real onboarding path with a synthetic age, ending on Discover with
 * a persona session. Shared so every spec exercises the same entry flow rather
 * than drifting copies of it. Everything here is a real write through the real
 * policy layer; nothing is stubbed.
 */
export async function onboard(page: Page, age: string): Promise<void> {
  await page.goto('/welcome');
  await page.getByLabel('Your age').fill(age);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('City').fill('Ajaccio');
  await page.getByRole('button', { name: /Ajaccio/ }).first().click();
  await page.getByLabel('What is it to you?').selectOption('resident');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('I practise… (comma separated)').fill('bike repair, freediving');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Take me in' }).click();
}
