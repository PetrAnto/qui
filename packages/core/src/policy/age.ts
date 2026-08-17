import { MINIMUM_AGE_YEARS, type AgeBand } from '../types';
import { ALLOW, deny, type ActorView, type Decision } from './decision';

/**
 * ADR-0002 (BASELINE, not LOCKED): the product accepts accounts from 15.
 *
 * The onboarding flow takes a declared age, converts it to a band and throws
 * the number away. Nothing downstream can ask "how old is this person" because
 * nothing downstream is given the answer.
 */
export function ageBandFromAge(age: number): AgeBand | null {
  if (!Number.isFinite(age) || age < MINIMUM_AGE_YEARS) return null;
  return age >= 18 ? 'adult_18_plus' : 'minor_15_17';
}

export function isAgeEligible(age: number): boolean {
  return ageBandFromAge(age) !== null;
}

export function isMinor(actor: Pick<ActorView, 'ageBand'>): boolean {
  return actor.ageBand === 'minor_15_17';
}

export function isAdult(actor: Pick<ActorView, 'ageBand'>): boolean {
  return actor.ageBand === 'adult_18_plus';
}

export function sameAgeBand(a: Pick<ActorView, 'ageBand'>, b: Pick<ActorView, 'ageBand'>): boolean {
  return a.ageBand === b.ageBand;
}

/**
 * INV-AGE-2. A private, two-person space is only opened between people in the
 * same age band. Adults and minors can still meet each other in hosted group
 * contexts, where a host is present and the exchange is not private.
 *
 * This is deliberately blunt. A rule an adult can talk their way around is not
 * a rule, and the MVP has nothing that requires cross-band privacy.
 */
export function canSharePrivateSpace(a: ActorView, b: ActorView): Decision {
  return sameAgeBand(a, b) ? ALLOW : deny('age_band_mismatch');
}

/** INV-AGE-4. Adult-audience content never reaches a minor surface. */
export function canSeeAudience(viewer: ActorView, audience: 'all' | 'adults_only'): Decision {
  if (audience === 'adults_only' && isMinor(viewer)) return deny('adults_only_content');
  return ALLOW;
}
