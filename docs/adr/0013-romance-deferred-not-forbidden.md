# ADR-0013 — Adult romance is DEFERRED, not permanently forbidden

**Status: LOCKED** for the long-term principle and the MVP constraint.
Supersedes the *eternal prohibition* in [ADR-0009](0009-signal-intent-scope.md).
Does **not** add a romantic surface.

Owner override (2026-08-17): treating romance as permanently OUT OF SCOPE was
product-definition drift. ADR-0009 remains valid for the **current MVP
vocabulary** (Ask / Offer / Join / Event only). It is no longer valid as a
claim that QUI can never have adult romantic discovery.

## Context

ADR-0009 closed `SIGNAL_TYPES` at four intents and stated that a romantic
intent would never exist on this product surface. That was a reasonable
autonomous MVP simplification: the product admits 15–17 year olds, and mixing
courtship into the same surface as “lend me a drill” is the largest
adult–minor risk in local social products.

The owner’s current canonical product is broader. QUI **may** later support
adult romantic discovery. It must never brand every person as a dating
candidate, treat “Single” as consent, or ship a Tinder-style public catalogue.

## Decision

### Long-term (LOCKED principle)

- QUI may support **adult-only** romantic discovery.
- Ordinary human connection, including future mutual adult romantic discovery,
  remains **free**.
- Being Single is never consent.
- Romantic openness should generally remain **private**.
- Preferred hypothesis: **private reciprocal Mutual Signals**, not a public
  catalogue and not an endless hot-or-not swipe.
- Adult romantic capabilities must remain **structurally unavailable to
  minors**.

### Current MVP (LOCKED constraint)

- Romance remains **DEFERRED and disabled**.
- `SIGNAL_TYPES` stays `{ask, offer, join, event}`.
- There is no romantic capability and no romantic UI.
- `INV-ROMANCE-1` continues to mean: **this build has no romantic surface**.
  It is an MVP safety constraint, not a claim that QUI can never have one.

### How a future romantic surface would arrive

Only via a **superseding ADR** that:

1. isolates the capability behind an adult-only policy function;
2. keeps minors structurally unable to see, emit, or receive it;
3. does not turn people discovery into a dating catalogue;
4. keeps Mutual Signals private and reciprocal;
5. re-runs independent adversarial review of the exact SHA.

Until that ADR exists, adding a romantic intent is a defect.

## Consequences

**Good.** The long-term product can be a local social world, not a civic
utility that pretends attraction does not exist. The MVP safety model does
not change today.

**Bad.** Documentation must now distinguish MVP mechanism from eternal
philosophy. That is the entire point of this ADR.

## Alternatives considered

- **Keep romance OUT OF SCOPE forever.** Rejected by owner decision.
- **Add Mutual Signals in this tranche.** Rejected: this is a canon
  reconciliation, not a romance implementation.
- **Weaken INV-ROMANCE-1 now.** Rejected: the invariant still correctly
  describes the shipped surface.
