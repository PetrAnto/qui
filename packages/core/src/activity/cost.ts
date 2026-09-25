/**
 * Declared cost of taking part. Information only: QUI holds no money, keeps no
 * ledger and settles nothing between people. Declaring a shared expense is
 * part of the free social core.
 *
 * Certainty is explicit. `known` is a price someone stated as fixed,
 * `estimated` is a guess, and `unknown` is the honest default for anything not
 * stated — including every signal created before costs existed. An unknown
 * cost is never treated as zero.
 */
export interface Money {
  /** Integer amount in the currency's minor unit (cents for EUR). */
  readonly amountMinor: number;
  /** ISO 4217 code, upper case. */
  readonly currency: string;
}

export type CostCertainty = 'known' | 'estimated';

export type ActivityCost =
  | { readonly kind: 'free' }
  | { readonly kind: 'unknown' }
  | {
      readonly kind: CostCertainty;
      readonly amount: Money;
      readonly per: 'person';
    }
  | {
      readonly kind: CostCertainty;
      readonly amount: Money;
      readonly per: 'activity';
      /** How many people the total is split between; null when not settled. */
      readonly splitAmong: number | null;
    };

export type PerPersonCost =
  | { readonly status: 'free' }
  | { readonly status: CostCertainty; readonly amount: Money }
  | { readonly status: 'unknown'; readonly why: 'not_stated' | 'split_unknown' };

export function perPersonCost(cost: ActivityCost): PerPersonCost {
  if (cost.kind === 'free') return { status: 'free' };
  if (cost.kind === 'unknown') return { status: 'unknown', why: 'not_stated' };
  if (cost.per === 'person') return { status: cost.kind, amount: cost.amount };
  if (cost.splitAmong === null || cost.splitAmong < 1) return { status: 'unknown', why: 'split_unknown' };
  // Rounded up: a share shown to someone deciding whether they can afford it
  // should never be the flattering side of the rounding.
  return {
    status: cost.kind,
    amount: {
      amountMinor: Math.ceil(cost.amount.amountMinor / cost.splitAmong),
      currency: cost.amount.currency,
    },
  };
}

export type CostOutcome = 'met' | 'unmet' | 'unknown';

/**
 * A per-person ceiling. An unknown cost cannot satisfy it, and neither can a
 * cost in another currency: converting would be inventing a number.
 */
export function withinBudget(cost: ActivityCost, ceiling: Money): CostOutcome {
  const share = perPersonCost(cost);
  if (share.status === 'free') return 'met';
  if (share.status === 'unknown') return 'unknown';
  if (share.amount.currency !== ceiling.currency) return 'unknown';
  return share.amount.amountMinor <= ceiling.amountMinor ? 'met' : 'unmet';
}

export function isFree(cost: ActivityCost): CostOutcome {
  if (cost.kind === 'free') return 'met';
  if (cost.kind === 'unknown') return 'unknown';
  return cost.amount.amountMinor === 0 ? 'met' : 'unmet';
}

/** "€9", "€9.50", "¥1,200" — the minor unit comes from the currency, not a guess. */
export function formatMoney(money: Money): string {
  const base = new Intl.NumberFormat('en-GB', { style: 'currency', currency: money.currency });
  const digits = base.resolvedOptions().maximumFractionDigits ?? 2;
  const major = money.amountMinor / 10 ** digits;
  if (!Number.isInteger(major)) return base.format(major);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: money.currency,
    maximumFractionDigits: 0,
  }).format(major);
}
