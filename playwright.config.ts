import { defineConfig, devices } from '@playwright/test';

/**
 * Mobile smoke test.
 *
 * One device, one worker, no parallelism. The demo store lives in the server
 * process and every test mutates it (that is the point — the flows are real
 * writes through the real policy layer), so tests that ran concurrently would
 * be testing each other. Serial and deterministic is worth more than fast for
 * a suite this size.
 *
 * The server is the production build rather than `next dev`, so what is
 * exercised is what would actually ship.
 */
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Escape hatch for environments that cannot reach the Playwright CDN and
 * already have a Chromium on disk. CI installs browsers the normal way and
 * leaves this unset.
 */
const CHROMIUM = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] === undefined ? 0 : 1,
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        ...(CHROMIUM === undefined ? {} : { launchOptions: { executablePath: CHROMIUM } }),
      },
    },
  ],
  webServer: {
    command: `pnpm --filter web exec next start --port ${PORT}`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: process.env['CI'] === undefined,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
