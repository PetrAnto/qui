import type { AccountState, AgeBand, Capability, UserId } from '../types';

/**
 * Every policy answer is auditable: a denial always names the rule that denied
 * it, so the UI can explain itself and tests can assert on the *reason* rather
 * than on a bare boolean.
 */
export type PolicyReason =
  | 'self'
  | 'blocked'
  | 'account_suspended'
  | 'author_suspended'
  | 'distribution_restricted'
  | 'missing_capability'
  | 'age_below_minimum'
  | 'age_band_mismatch'
  | 'adults_only_content'
  | 'minor_not_discoverable'
  | 'no_signal_context'
  | 'signal_not_open'
  | 'signal_full'
  | 'wrong_signal_type'
  | 'host_excluded'
  | 'not_host'
  | 'not_participant'
  | 'thread_closed'
  | 'content_removed'
  | 'no_local_attachment'
  | 'moderation_private';

/**
 * The allowed branch carries an explicit `reason?: undefined` so that callers —
 * tests especially — can read `.reason` off an un-narrowed decision and get
 * `PolicyReason | undefined` rather than a type error. Narrowing on `allowed`
 * still works exactly as before, and `deny()` still cannot omit a reason.
 */
export type Decision =
  | { readonly allowed: true; readonly reason?: undefined }
  | { readonly allowed: false; readonly reason: PolicyReason };

export const ALLOW: Decision = Object.freeze({ allowed: true as const });

export function deny(reason: PolicyReason): Decision {
  return { allowed: false, reason };
}

/** Returns the first denial, or ALLOW when every rule passed. */
export function all(...decisions: readonly Decision[]): Decision {
  for (const decision of decisions) {
    if (!decision.allowed) return decision;
  }
  return ALLOW;
}

export type PersonRole = 'member' | 'moderator';

/**
 * The projection of a person that policy is allowed to see. Policy never reads
 * a full `Person`: keeping the input this narrow is what stops a rule from
 * quietly depending on a bio, a photo or a date of birth.
 */
export interface ActorView {
  readonly id: UserId;
  readonly ageBand: AgeBand;
  readonly accountState: AccountState;
  readonly role: PersonRole;
  readonly capabilities: ReadonlySet<Capability>;
}

export function isActive(actor: ActorView): boolean {
  return actor.accountState === 'active' || actor.accountState === 'distribution_restricted';
}

export function requireActive(actor: ActorView): Decision {
  return isActive(actor) ? ALLOW : deny('account_suspended');
}

export function requireCapability(actor: ActorView, capability: Capability): Decision {
  return actor.capabilities.has(capability) ? ALLOW : deny('missing_capability');
}
