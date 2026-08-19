import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Reproducibility guard for the deploy script.
 *
 * The regression behind this test: `deploy` ran `opennextjs-cloudflare deploy`
 * on its own, which only *uploads* `.open-next`. A clean checkout has no
 * `.open-next` bundle, so deploying from one failed — and the failure only
 * showed up when a redeploy was time-critical (2026-08-19, post-#31). The
 * Cloudflare framework guide's canonical script builds first:
 * `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.
 *
 * This test exists because the broken version *looked* correct: it worked
 * every time the deployer happened to have a fresh local build.
 */
interface PackageJson {
  readonly scripts?: Readonly<Record<string, string>>;
}

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
) as PackageJson;

describe('web deploy script', () => {
  it('builds before deploying so a clean checkout can deploy', () => {
    const deploy = packageJson.scripts?.['deploy'] ?? '';
    const buildAt = deploy.indexOf('opennextjs-cloudflare build');
    const deployAt = deploy.indexOf('opennextjs-cloudflare deploy');
    expect(buildAt, 'deploy script must run the OpenNext build first').toBeGreaterThanOrEqual(0);
    expect(deployAt, 'deploy script must invoke the OpenNext deploy').toBeGreaterThan(buildAt);
  });
});
