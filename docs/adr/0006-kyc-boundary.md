# ADR-0006 — KYC boundary: documents never enter the system

**Status: LOCKED** for the boundary. **DEFERRED** for live verification, which
has no provider and is flagged off.

## Context

Two pressures point at identity documents. Age assurance: self-declared age is
weak, and it is the largest hole in the minors threat model. Trust: a verified
identity would make vouching and hosting safer.

Both pressures lead to the same trap. A social product that collects identity
documents becomes a custodian of the strongest possible personal data for a
population that includes minors — with breach liability, retention obligations,
and a chilling effect on the people who most need a network they did not
inherit. The cure is worse than the disease, and the regulator agrees: age
verification must not become general identification
([legal/AGE_BASELINE.md](../legal/AGE_BASELINE.md)).

## Decision

**Identity-document material cannot enter the system** — not "is not collected",
but *cannot* (`INV-KYC-1`). This is enforced at two levels:

1. **Structurally.** `Attestation` has no field able to hold a document image, a
   document number, a full date of birth, an address or a biometric. The
   complete set of fields we are willing to persist is: subject, kind, scope,
   `result` (verified/failed/pending), `method`, an opaque `providerRef`, an
   `ageThreshold` of `15 | 18 | null`, a country code, and validity dates.
2. **At intake.** `acceptAttestation()` **rejects document and biometric fields
   by name**, and rejects unknown fields rather than silently dropping them
   (`INV-SOCIAL-1` covers the credential equivalent). Silent dropping would let
   a caller believe the data was accepted, and would make the next refactor the
   one that starts storing it.

**Only the threshold crosses the boundary** — that a check for 15 or 18 returned
yes or no, never the age itself.

**The shape of the real flow**, for whoever implements it:

```
browser → hosted provider session → provider → signed webhook → intake
```

The provider holds the document. This system receives an opaque reference and a
boolean. Implementations must verify the webhook signature before calling
`acceptAttestation`.

**Live verification is absent, not stubbed.** `DisabledIdentityProvider` rejects
everything; `SandboxIdentityProvider` produces attestations labelled
`provider_sandbox` so no derived capability can be mistaken for a real check
(`INV-KYC-2`). There is no code path that records a live verification which
never happened. Behind `liveIdentityVerification`
(`INDENOI_FEATURE_LIVE_IDENTITY`), default off.

## Consequences

**Good.** A breach of this system cannot expose an identity document, because it
does not hold one. The regulatory surface shrinks from "document custodian" to
"processor of a boolean". The abstraction exists now, so the day a provider is
signed, nothing above the boundary changes.

**Bad.** Age assurance stays weak until a provider is contracted — the
acknowledged T1 residual risk in
[threat-model/MINORS_AND_LOCAL_CONFLICT.md](../threat-model/MINORS_AND_LOCAL_CONFLICT.md).
Provider verification also costs money per check, which will shape when it can
be required.

**Neutral.** Enabling the flag requires re-verifying `INV-KYC-1` against the
real provider payload, not only the test fixtures
([RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)).

## Alternatives considered

- **Collect documents ourselves.** Rejected on every axis: harm, liability,
  chilling effect, and it is the thing regulators warn against.
- **Stub a provider that returns "verified".** A lie in code that becomes a
  production default the first time someone tests a happy path.
- **Credit-card check as a proxy for adulthood.** Excludes exactly the people
  the product wants, and collects payment data to answer a yes/no question.
- **Store the verified age, not just the threshold.** One field, and it
  reintroduces the identifier [ADR-0002](0002-age-boundary.md) exists to avoid.
