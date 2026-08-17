/**
 * Capability flags.
 *
 * Everything in this build that would touch a real person is a flag, and every
 * one of those flags is off. That is not a placeholder: real authentication, a
 * real identity provider, a real media pipeline and a real database each need a
 * decision and a contract that this project does not have yet (ADR-0005,
 * ADR-0006, ADR-0007, ADR-0011). A capability that is "almost wired up" is the
 * one that ships by accident, so the safe value is also the default value and
 * the only way to change it is an exact, deliberate opt-in.
 *
 * INV-DEMO-1 asserts all of this executably.
 */

export interface FeatureFlags {
  /** Passkey/OIDC sign-in. Off: the app ships a demo persona switcher. */
  readonly productionAuth: boolean;
  /** Hosted identity/age verification provider. Off: sandbox evidence only. */
  readonly liveIdentityVerification: boolean;
  /** Uploads, transcoding and EXIF stripping. Off: generated artwork only. */
  readonly mediaUploads: boolean;
  /** D1-backed persistence. Off: the in-isolate demo repository. */
  readonly persistentDatabase: boolean;
}

export const PRODUCTION_CAPABILITY_FLAGS = [
  'productionAuth',
  'liveIdentityVerification',
  'mediaUploads',
  'persistentDatabase',
] as const satisfies readonly (keyof FeatureFlags)[];

export const DEMO_FEATURES: FeatureFlags = Object.freeze({
  productionAuth: false,
  liveIdentityVerification: false,
  mediaUploads: false,
  persistentDatabase: false,
});

const ENV_KEYS: Readonly<Record<keyof FeatureFlags, string>> = {
  productionAuth: 'INDENOI_FEATURE_PRODUCTION_AUTH',
  liveIdentityVerification: 'INDENOI_FEATURE_LIVE_IDENTITY',
  mediaUploads: 'INDENOI_FEATURE_MEDIA_UPLOADS',
  persistentDatabase: 'INDENOI_FEATURE_D1',
};

/** Exact match only. 'yes', '1' and 'TRUE' do not enable anything. */
function enabled(env: Readonly<Record<string, string | undefined>>, key: string): boolean {
  return env[key] === 'true';
}

export function resolveFeatures(
  env: Readonly<Record<string, string | undefined>> = {},
): FeatureFlags {
  return {
    productionAuth: enabled(env, ENV_KEYS.productionAuth),
    liveIdentityVerification: enabled(env, ENV_KEYS.liveIdentityVerification),
    mediaUploads: enabled(env, ENV_KEYS.mediaUploads),
    persistentDatabase: enabled(env, ENV_KEYS.persistentDatabase),
  };
}

/**
 * True while every production capability is still off. The interface uses this
 * to decide whether it is allowed to describe itself as a demo — a build that
 * has switched one of these on must stop showing the demo banner, because the
 * banner would then be a lie.
 */
export function isDemoBuild(flags: FeatureFlags): boolean {
  return PRODUCTION_CAPABILITY_FLAGS.every((flag) => !flags[flag]);
}
