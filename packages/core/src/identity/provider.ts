import type { Attestation, Instant, UserId } from '../types';
import { acceptAttestation, type IntakeResult } from './intake';

/**
 * Identity verification provider boundary (ADR-0006).
 *
 * No provider contract exists for this project yet, so the live implementation
 * is intentionally absent rather than stubbed with something that returns
 * "verified". The abstraction exists now so that the day a provider is signed,
 * nothing above this line changes.
 *
 * Shape of the real flow, for the implementer who arrives later:
 *
 *   browser -> hosted provider session -> provider -> signed webhook -> here
 *
 * Only the minimal attestation crosses this boundary. The document never does.
 */
export interface VerificationSession {
  readonly sessionId: string;
  readonly redirectUrl: string;
  readonly mode: 'sandbox' | 'live';
}

export interface IdentityProvider {
  readonly id: string;
  readonly mode: 'disabled' | 'sandbox' | 'live';
  start(subjectId: UserId, now: Instant): Promise<VerificationSession>;
  /**
   * Converts a provider callback into an attestation. Implementations must
   * verify the signature before calling `acceptAttestation`.
   */
  ingest(payload: unknown, context: { id: string; subjectId: UserId; now: Instant }): IntakeResult;
}

export class DisabledIdentityProvider implements IdentityProvider {
  readonly id = 'disabled';
  readonly mode = 'disabled' as const;

  start(): Promise<VerificationSession> {
    return Promise.reject(new Error('identity_verification_disabled'));
  }

  ingest(): IntakeResult {
    return { ok: false, rejection: 'live_provider_unavailable', field: null };
  }
}

/**
 * Development provider. Produces attestations labelled `provider_sandbox` so
 * that no capability derived from them can ever be mistaken for a real check.
 */
export class SandboxIdentityProvider implements IdentityProvider {
  readonly id = 'sandbox';
  readonly mode = 'sandbox' as const;

  start(subjectId: UserId): Promise<VerificationSession> {
    return Promise.resolve({
      sessionId: `sandbox-${subjectId}`,
      redirectUrl: '/onboarding/identity/sandbox',
      mode: 'sandbox',
    });
  }

  ingest(payload: unknown, context: { id: string; subjectId: UserId; now: Instant }): IntakeResult {
    return acceptAttestation(payload, { ...context, liveProviderEnabled: false });
  }
}

export function isProductionVerified(attestation: Attestation): boolean {
  return attestation.kind === 'identity_verified' && attestation.method === 'provider_live';
}
