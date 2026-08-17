import { isDemoBuild, resolveFeatures, type FeatureFlags } from '@indenoi/core';

/**
 * Capability flags for this deployment.
 *
 * Resolved once, from the environment, with every production capability
 * defaulting to off (INV-DEMO-1). The banner, the onboarding copy and the
 * identity screen all read from here rather than hard-coding "this is a demo",
 * so that a build which does switch one of these on stops claiming to be one.
 */
export const FEATURES: FeatureFlags = resolveFeatures(
  process.env as Readonly<Record<string, string | undefined>>,
);

export const IS_DEMO_BUILD = isDemoBuild(FEATURES);
