import { describe, expect, it } from 'vitest';

import {
  DEMO_FEATURES,
  PRODUCTION_CAPABILITY_FLAGS,
  isDemoBuild,
  resolveFeatures,
} from '../src/config/features';

/**
 * INV-DEMO-1. The build that ships here is a local demo. Every capability that
 * would touch a real person — real authentication, a real identity provider,
 * real uploaded media, a real database — is a flag, and every one of those flags
 * is off. A capability that is "nearly wired up" is the one that gets shipped by
 * accident, so the safe value is also the default value.
 */
describe('INV-DEMO-1 production capabilities ship disabled', () => {
  it('has every production capability off in the shipped demo', () => {
    for (const flag of PRODUCTION_CAPABILITY_FLAGS) {
      expect(DEMO_FEATURES[flag]).toBe(false);
    }
    expect(isDemoBuild(DEMO_FEATURES)).toBe(true);
  });

  it('defaults to the demo posture when the environment says nothing', () => {
    expect(resolveFeatures({})).toEqual(DEMO_FEATURES);
    expect(resolveFeatures({ INDENOI_FEATURE_MEDIA_UPLOADS: undefined })).toEqual(DEMO_FEATURES);
  });

  it('only accepts an exact opt-in, so a stray value cannot enable a capability', () => {
    for (const value of ['1', 'yes', 'TRUE', 'true ', '']) {
      expect(resolveFeatures({ INDENOI_FEATURE_LIVE_IDENTITY: value }).liveIdentityVerification).toBe(
        false,
      );
    }
    expect(resolveFeatures({ INDENOI_FEATURE_LIVE_IDENTITY: 'true' }).liveIdentityVerification).toBe(
      true,
    );
  });

  it('stops calling itself a demo as soon as one production capability is on', () => {
    for (const flag of PRODUCTION_CAPABILITY_FLAGS) {
      expect(isDemoBuild({ ...DEMO_FEATURES, [flag]: true })).toBe(false);
    }
  });
});
