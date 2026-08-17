# indenoi

`indenoi` is an internal codename for a multi-city, local-first human social
MVP. It is not a public brand and not a launched product.

**Build status: local demo. All data is synthetic. Nothing here has been
deployed.**

## What this build is

A working vertical slice of the product's rules. Every screen, route handler,
policy check and safety invariant is real and executable. What is *not* real is
everything that would touch an actual person: authentication, identity
verification, media uploads and persistent storage are all behind capability
flags, and every one of those flags is **off** by default
([ADR-0005](docs/adr/0005-authentication-dev-boundary.md),
[ADR-0006](docs/adr/0006-kyc-boundary.md),
[ADR-0007](docs/adr/0007-media.md),
[ADR-0011](docs/adr/0011-persistence-boundary.md)).

Concretely:

- **Sign-in is a persona switcher** over a cast of 14 fictional people.
- **All content, cities and relationships are seeded synthetic data.** No
  real person is a user, a persona, or a testimonial in this repository.
  The welcome page may show licensed editorial photographs of real people
  *as illustrations only*; they are documented in
  [docs/assets/LANDING_HERO_PHOTOGRAPHY.md](docs/assets/LANDING_HERO_PHOTOGRAPHY.md)
  and must never be bound to an identity.
- **State lives in the server isolate and resets.** There is no database
  connection in this build.
- **There are no uploads.** Avatars and imagery are generated deterministically
  from the handle.

## Quick start

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

Verification, in the order CI runs it:

```sh
pnpm lint
pnpm typecheck
pnpm test         # 159 tests
pnpm test:safety  # the INV-* safety invariants, as a named gate
pnpm e2e          # mobile smoke suite (needs a Chromium)
```

Node >= 22.12, pnpm 10.33.

## The product in one paragraph

A person picks a city they have a real tie to, says one of four things out loud
— **Ask**, **Offer**, **Join**, **Event** — and someone local answers. Contact
always begins from something somebody chose to publish; there are no
unsolicited direct messages. Trust is not a score: it is separate pieces of
evidence (a verified email, an attested local presence, vouches from named
people), and each piece unlocks specific capabilities. Read
[docs/PRODUCT.md](docs/PRODUCT.md) for the full shape and
[docs/NON_GOALS.md](docs/NON_GOALS.md) for what it deliberately is not.

## Safety posture

The core safety rules are **LOCKED** and executable. `INV-AGE-2`, for example,
is not a paragraph in a policy document — it is a test asserting that a private
two-person space never opens across age bands. The full list, with what each one
means and where it is enforced, is in [docs/SAFETY.md](docs/SAFETY.md).

Two boundaries are structural rather than checked: no type in the domain can
hold a person-level coordinate, and no type can hold identity-document material.
A check can be forgotten; a type that cannot express the thing cannot be.

Minimum age is **15 (BASELINE)** — see
[docs/legal/AGE_BASELINE.md](docs/legal/AGE_BASELINE.md) for the legal grounding
and why it is a baseline rather than a locked decision.

## Documentation

| Document | What it answers |
|---|---|
| [AGENTS.md](AGENTS.md) | Rules for changing this repo. Read before editing. |
| [docs/PRODUCT.md](docs/PRODUCT.md) | What the product is and who it is for. |
| [docs/SAFETY.md](docs/SAFETY.md) | Every safety invariant and its enforcement point. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the code is laid out and why. |
| [docs/NON_GOALS.md](docs/NON_GOALS.md) | What this is not, and what is out of scope for good. |
| [docs/EXPERIMENTS.md](docs/EXPERIMENTS.md) | The open questions and how we would answer them. |
| [docs/TEST_EVIDENCE.md](docs/TEST_EVIDENCE.md) | What is actually verified, and what is not. |
| [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) | What must be true before this touches a real user. |
| [docs/RELEASE_REVIEW.md](docs/RELEASE_REVIEW.md) | Adversarial review of the landed demo SHA; deploy decision. |
| [docs/legal/AGE_BASELINE.md](docs/legal/AGE_BASELINE.md) | The 15+ baseline and its sources. |
| [docs/geo/PROVENANCE.md](docs/geo/PROVENANCE.md) | Where the geography data comes from, and its licence. |
| [docs/assets/LANDING_HERO_PHOTOGRAPHY.md](docs/assets/LANDING_HERO_PHOTOGRAPHY.md) | Welcome-hero photographs: licence, attribution, residual risk. |
| [docs/threat-model/MINORS_AND_LOCAL_CONFLICT.md](docs/threat-model/MINORS_AND_LOCAL_CONFLICT.md) | The two threat models the design actually targets. |
| [docs/adr/](docs/adr/) | The decisions, each with an explicit status. |

## Attribution

City and administrative data derived from [GeoNames](https://www.geonames.org/),
licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See
[docs/geo/PROVENANCE.md](docs/geo/PROVENANCE.md).
