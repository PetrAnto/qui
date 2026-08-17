import type { Attestation, AttestationKind, AttestationMethod, Instant } from '../types';

/**
 * The intake boundary for trust evidence.
 *
 * Two things must be structurally impossible, not merely discouraged:
 *
 *  INV-KYC-1 — identity document material never enters the system. We take a
 *  provider reference and a yes/no, and that is all the shape can hold.
 *
 *  INV-SOCIAL-1 — a third-party password or session token is never accepted,
 *  even if a caller volunteers one. Account-ownership proof will be OAuth, and
 *  until then the answer is no.
 *
 * The parser is an allowlist: unknown keys are rejected rather than dropped, so
 * a well-meaning future caller cannot smuggle a field in and have it silently
 * ignored (and then, one refactor later, silently stored).
 */

export type IntakeRejection =
  | 'unknown_kind'
  | 'unsupported_field'
  | 'document_material'
  | 'plaintext_credential'
  | 'invalid_result'
  | 'live_provider_unavailable';

export type IntakeResult =
  | { readonly ok: true; readonly attestation: Attestation }
  | { readonly ok: false; readonly rejection: IntakeRejection; readonly field: string | null };

const ALLOWED_FIELDS: ReadonlySet<string> = new Set([
  'kind',
  'geoScopeId',
  'result',
  'method',
  'providerRef',
  'ageThreshold',
  'country',
]);

const ALLOWED_KINDS: ReadonlySet<string> = new Set<AttestationKind>([
  'email_verified',
  'age_threshold_verified',
  'identity_verified',
  'local_presence_verified',
  'community_vouched',
  'organization_role_verified',
  'social_account_verified',
]);

/** Field names that indicate identity-document material reaching our servers. */
const DOCUMENT_FIELDS: readonly string[] = [
  'documentnumber',
  'documentimage',
  'documentfront',
  'documentback',
  'idimage',
  'idnumber',
  'passportnumber',
  'selfie',
  'selfievideo',
  'livenessvideo',
  'faceimage',
  'dateofbirth',
  'dob',
  'birthdate',
  'address',
  'homeaddress',
  'nationalid',
  'mrz',
];

/** Field names that indicate a third-party credential reaching our servers. */
const CREDENTIAL_FIELDS: readonly string[] = [
  'password',
  'passwd',
  'secret',
  'accesstoken',
  'refreshtoken',
  'sessioncookie',
  'cookie',
  'apikey',
  'privatekey',
  'instagrampassword',
  'credentials',
];

function classify(field: string): IntakeRejection | null {
  const normalized = field.toLowerCase().replace(/[^a-z]/g, '');
  if (DOCUMENT_FIELDS.some((candidate) => normalized.includes(candidate))) return 'document_material';
  if (CREDENTIAL_FIELDS.some((candidate) => normalized.includes(candidate))) return 'plaintext_credential';
  return null;
}

export interface IntakeContext {
  readonly id: string;
  readonly subjectId: string;
  readonly now: Instant;
  /**
   * Live identity verification needs a provider contract that does not exist
   * yet. Sandbox evidence is accepted and labelled as such; claiming a live
   * verification we did not perform is never acceptable.
   */
  readonly liveProviderEnabled: boolean;
}

export function acceptAttestation(input: unknown, context: IntakeContext): IntakeResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, rejection: 'unsupported_field', field: null };
  }
  const record = input as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    const dangerous = classify(key);
    if (dangerous !== null) return { ok: false, rejection: dangerous, field: key };
    if (!ALLOWED_FIELDS.has(key)) return { ok: false, rejection: 'unsupported_field', field: key };
  }

  const kind = record['kind'];
  if (typeof kind !== 'string' || !ALLOWED_KINDS.has(kind)) {
    return { ok: false, rejection: 'unknown_kind', field: 'kind' };
  }

  const result = record['result'];
  if (result !== 'verified' && result !== 'failed' && result !== 'pending') {
    return { ok: false, rejection: 'invalid_result', field: 'result' };
  }

  const method = (record['method'] ?? 'self_declared') as AttestationMethod;
  if (method === 'provider_live' && !context.liveProviderEnabled) {
    return { ok: false, rejection: 'live_provider_unavailable', field: 'method' };
  }

  const ageThreshold = record['ageThreshold'];
  const country = record['country'];
  const providerRef = record['providerRef'];
  const geoScopeId = record['geoScopeId'];

  return {
    ok: true,
    attestation: {
      id: context.id,
      subjectId: context.subjectId,
      kind: kind as AttestationKind,
      geoScopeId: typeof geoScopeId === 'string' ? geoScopeId : null,
      result,
      method,
      providerRef: typeof providerRef === 'string' ? providerRef : null,
      ageThreshold: ageThreshold === 15 || ageThreshold === 18 ? ageThreshold : null,
      country: typeof country === 'string' ? country.slice(0, 2).toUpperCase() : null,
      issuedAt: context.now,
      expiresAt: null,
    },
  };
}

/**
 * Anything we log about an intake attempt: names of offending fields, never
 * their values.
 */
export function redactedIntakeLog(input: unknown): Record<string, string> {
  if (typeof input !== 'object' || input === null) return { shape: 'non_object' };
  const out: Record<string, string> = {};
  for (const key of Object.keys(input as Record<string, unknown>)) {
    out[key] = classify(key) ?? (ALLOWED_FIELDS.has(key) ? 'accepted' : 'unsupported');
  }
  return out;
}
