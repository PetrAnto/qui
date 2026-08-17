# ADR-0002 — Age boundary

**Status: BASELINE for the threshold (15). LOCKED for the band model and for
`INV-AGE-1` … `INV-AGE-4`.**

## Context

The product is about local life, and local life includes teenagers. Excluding
15–17 year olds would be easier to defend in a meeting and worse for the people
it claims to protect: it pushes them to services with weaker rules. Admitting
them means owning the ways an adult can use a local product to reach a minor.

Separately, storing ages is a liability. A date of birth is a strong identifier,
useful for correlation, and almost never needed for the decision at hand — which
is nearly always "is this person 15+ / 18+", not "how old is this person".

## Decision

**Minimum age 15** (`MINIMUM_AGE_YEARS`). Below it, no account is created:
`ageBandFromAge()` returns `null` rather than a band, so no code path can
produce an under-15 actor (`INV-AGE-1`).

**Age is stored as a band, never a number.** `AgeBand` is
`'minor_15_17' | 'adult_18_plus'`. Onboarding takes a declared age, derives the
band, and discards the input. Nothing downstream can ask how old someone is,
because nothing downstream is given the answer.

**Four locked rules follow:**

- `INV-AGE-2` — a private two-person space opens only within the same band.
  Cross-band contact happens in hosted group contexts, where a host is present
  and the exchange is not private.
- `INV-AGE-3` — minors do not appear in people discovery for adults.
- `INV-AGE-4` — adult-audience content never reaches a minor surface.
- **Hosting and vouching require 18+** — both carry responsibility over other
  people, including the power to exclude someone from a space.

Legal grounding and the sources behind the number:
[legal/AGE_BASELINE.md](../legal/AGE_BASELINE.md).

## Consequences

**Good.** The whole class of "how do we handle a 13-year-old's data" questions
is closed by not having the data. `INV-AGE-2` is deliberately blunt: a rule an
adult can talk their way around is not a rule, and the MVP has no feature that
needs cross-band privacy.

**Bad.** Bands cannot express a rule that needs a finer distinction — a future
16+ threshold would require a new band and a migration. A 13- or 14-year-old in
a jurisdiction that permits them is excluded; that is the cost of one rule
instead of twenty-seven, and it is why the threshold is BASELINE.

**Acknowledged weakness.** Age is **self-declared** in this build. An adult who
declares 16 lands in the minor band, and `INV-AGE-2` then permits the private
space. This is the largest hole in the threat model
([threat-model/MINORS_AND_LOCAL_CONFLICT.md](../threat-model/MINORS_AND_LOCAL_CONFLICT.md),
T1). The mitigation — a threshold-only attestation from a provider — is built
and disabled ([ADR-0006](0006-kyc-boundary.md)).

## Alternatives considered

- **18+ only.** Simplest, and abandons the people who most need a local network
  they did not inherit from their parents.
- **Store date of birth.** Enables finer rules, at the cost of holding a strong
  identifier for every user, including every minor. Rejected.
- **Three or more bands.** More expressive, more surface, no MVP rule needs it.
- **Age verification at signup.** Correct eventually; today there is no provider
  and no DPIA, and a stub that returns "verified" would be a lie in code.
