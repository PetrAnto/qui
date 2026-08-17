# QUI

**QUI** is a local-first human social product.

> Make the people around us visible again.

> The feed earns attention. The graph should turn some of that attention into
> real life.

Intended primary domain: **qui.social** (not connected from this repository
until independently verified). This GitHub tree may still use the internal
codename `indenoi` in package names.

**Build status: local / synthetic demo. All accounts and posts are invented.
Editorial landing photographs are not members. Nothing here is real-user
production.**

## What this build is

A working vertical slice of QUI’s rules. Every screen, route handler, policy
check and safety invariant is real and executable. What is *not* real is
everything that would touch an actual person: authentication, identity
verification, media uploads and persistent storage are behind capability
flags, and every one of those flags is **off** by default.

Concretely:

- **Sign-in is a persona switcher** over a cast of 14 fictional people.
- **All content, cities and relationships are seeded synthetic data.** No
  real person is a user, a persona, or a testimonial in this repository.
- **State lives in the server isolate and resets.** There is no database
  connection in this build.
- **There are no uploads.** In-app avatars and feed imagery are generated
  deterministically from the handle.
- **Welcome-hero photographs** are licensed editorial stills of real people
  *as illustrations only*. They are not QUI members, not locals, and never
  bound to a demo identity. Provenance:
  [docs/assets/LANDING_HERO_PHOTOGRAPHY.md](docs/assets/LANDING_HERO_PHOTOGRAPHY.md).

## Quick start

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

Verification, in the order CI runs it:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:safety
pnpm e2e
```

Node >= 22.12, pnpm 10.33.

## The product in one paragraph

A person picks a city they have a real tie to — or explores any city — sees
what people there actually do, and can say one of four things out loud:
**Ask**, **Offer**, **Join**, **Event**. Contact begins from something
somebody chose to publish. Trust is not a score. Read
[docs/PRODUCT.md](docs/PRODUCT.md) for the long-term world (including Local
Reels, Social Bridges, and deferred adult Mutual Signals) and
[docs/NON_GOALS.md](docs/NON_GOALS.md) for what is actually out of scope.

## Safety posture

The core safety rules are **LOCKED for the current surface**. `INV-AGE-2`,
for example, is a test asserting that a private two-person space never opens
across age bands. The full list is in [docs/SAFETY.md](docs/SAFETY.md).

Minimum age is **15 (BASELINE)** — see
[docs/legal/AGE_BASELINE.md](docs/legal/AGE_BASELINE.md). That is not a
claim that QUI is legally cleared for 15+ in every jurisdiction.

## Documentation

| Document | What it answers |
|---|---|
| [AGENTS.md](AGENTS.md) | Rules for changing this repo. Read before editing. |
| [docs/PRODUCT.md](docs/PRODUCT.md) | What QUI is, now and later. |
| [docs/SAFETY.md](docs/SAFETY.md) | Every safety invariant and its enforcement point. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the code is laid out and why. |
| [docs/NON_GOALS.md](docs/NON_GOALS.md) | Eternal nos vs deferred laters. |
| [docs/EXPERIMENTS.md](docs/EXPERIMENTS.md) | Open questions and how we would answer them. |
| [docs/TEST_EVIDENCE.md](docs/TEST_EVIDENCE.md) | What is actually verified. |
| [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) | Real-user production gates. |
| [docs/RELEASE_REVIEW.md](docs/RELEASE_REVIEW.md) | Adversarial review of the demo SHA. |
| [docs/adr/0013-romance-deferred-not-forbidden.md](docs/adr/0013-romance-deferred-not-forbidden.md) | Romance is deferred, not banned. |
| [docs/adr/0014-public-brand-qui.md](docs/adr/0014-public-brand-qui.md) | Brand. |
| [docs/adr/0015-public-synthetic-demo.md](docs/adr/0015-public-synthetic-demo.md) | Demo deploy vs production. |
| [docs/legal/AGE_BASELINE.md](docs/legal/AGE_BASELINE.md) | The 15+ baseline and its sources. |
| [docs/geo/PROVENANCE.md](docs/geo/PROVENANCE.md) | Geography data and licence. |
| [docs/assets/LANDING_HERO_PHOTOGRAPHY.md](docs/assets/LANDING_HERO_PHOTOGRAPHY.md) | Landing photo rights. |
| [docs/adr/](docs/adr/) | Decisions, each with an explicit status. |

## Attribution

City and administrative data derived from [GeoNames](https://www.geonames.org/),
licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See
[docs/geo/PROVENANCE.md](docs/geo/PROVENANCE.md).

Landing photographs: see
[docs/assets/LANDING_HERO_PHOTOGRAPHY.md](docs/assets/LANDING_HERO_PHOTOGRAPHY.md).
They are not relicensed as product code.
