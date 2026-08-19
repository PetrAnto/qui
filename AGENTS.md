# AGENTS.md

Rules for anyone changing this repository — human or agent. They exist because
this codebase encodes safety decisions that are cheap to break by accident and
expensive to discover afterwards.

## Status vocabulary

Every decision in this repo carries one of these words. Use them exactly.

| Term | Meaning |
|---|---|
| **LOCKED** | Cannot change without a new ADR that supersedes the old one *and* a recorded product-owner decision. Changing the code without changing the ADR is a defect. |
| **BASELINE** | A deliberate current position that is expected to be revisited (typically per jurisdiction or per launch city). Changing it is a normal ADR amendment. |
| **HYPOTHESIS** | A product or implementation idea worth testing that is not settled truth. Do not silently promote it to a requirement. |
| **OPEN** | Not decided. Do not implement a default and call it a decision. |
| **DEFERRED** | Decided *not now*. The shape exists; the implementation does not. |
| **REJECTED** | Explicitly rejected as the current product/implementation direction. Do not reintroduce it without a recorded owner decision. |
| **OUT OF SCOPE** | Decided *never, in this product surface*. Not a backlog item. |

## Canonical product, brand and UX documents

Before changing product behavior, visual design, landing-page messaging or core
application UX, read these four files:

1. [docs/canon/01_BRAND_SYSTEM.md](docs/canon/01_BRAND_SYSTEM.md)
2. [docs/canon/02_PRODUCT_DOCTRINE.md](docs/canon/02_PRODUCT_DOCTRINE.md)
3. [docs/canon/03_LANDING_PAGE_SPEC.md](docs/canon/03_LANDING_PAGE_SPEC.md)
4. [docs/canon/04_APPLICATION_UX_SYSTEM.md](docs/canon/04_APPLICATION_UX_SYSTEM.md)

They record the latest owner-approved product/brand direction, including
**REAL · EQUAL · ACTIVE · LOCAL**, the light product design system, the darker
cinematic landing-page mode, equal structural standing, worldwide city
exploration, Discover → Signals → action, and the open-source/build-in-public
execution constraint.

### Precedence and conflict rule

- **Safety invariants remain binding.** Nothing in the product/brand canon may
  silently weaken an `INV-*` rule, privacy boundary or security constraint.
- For **brand, product doctrine, landing-page narrative and application UX**,
  `docs/canon/*` is newer than older prose in `docs/PRODUCT.md`,
  `docs/NON_GOALS.md`, `docs/EXPERIMENTS.md` and historical context. Where the
  older prose conflicts only on those product/UX topics, use the newer canon.
- Accepted ADRs remain the source of truth for explicit architectural and
  safety decisions. If an ADR or executable invariant conflicts with the newer
  product canon, **stop and surface the conflict**. Do not guess which side to
  weaken; reconciliation requires an owner decision and, when appropriate, a
  superseding ADR.
- Historical `DEFERRED` / `OUT OF SCOPE` decisions remain meaningful. The newer
  `HYPOTHESIS` / `REJECTED` terms do not silently rewrite old ADR history.
- GitHub is the public source of truth for non-sensitive development history.
  Build in public does not mean publishing secrets, real private user data,
  active vulnerability details or abuse-detection information that would make
  attacks materially easier.

## Non-negotiables

1. **The safety invariants (`INV-*`) are LOCKED.** They are listed in
   [docs/SAFETY.md](docs/SAFETY.md) and executed by
   `packages/core/test/safety-invariants.test.ts`. Never weaken, skip, or
   `it.todo` one. If a feature requires breaking an invariant, the feature is
   wrong until an ADR says otherwise.
2. **Never introduce a `trustLevel`, score, or karma field.** Trust is
   multidimensional evidence, not a ladder ([ADR-0003](docs/adr/0003-trust-evidence-capabilities.md)).
3. **Never add a field that can hold person-level coordinates**, a document
   image, a document number, a full date of birth, or a third-party credential.
   The types are deliberately unable to express these (`INV-GEO-1`, `INV-KYC-1`,
   `INV-SOCIAL-1`).
4. **Never store an age.** Onboarding takes a declared age, derives an
   `AgeBand`, and discards the number ([ADR-0002](docs/adr/0002-age-boundary.md)).
5. **Never flip a production capability flag by default.** `productionAuth`,
   `liveIdentityVerification`, `mediaUploads` and `persistentDatabase` default
   to `false` and only an exact `'true'` string enables them (`INV-DEMO-1`).
6. **Never branch on which city it is.** Geography is data, not code
   ([ADR-0004](docs/adr/0004-geography.md)).
7. **Do not deploy, provision, push, or configure a Cloudflare account** from
   this repo. `wrangler.jsonc` intentionally has no account id and no D1 id.
   See [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md).

## Where things belong

- **`packages/core`** — types, policy, ranking, services. Pure. No `fetch`, no
  database, no framework import, no `Date.now()` inside policy (time is passed
  in as an `Instant`). If a rule can be expressed here, it belongs here, because
  it is then testable without a server.
- **`packages/db`** — repository implementations and the schema. The in-memory
  repository is a full, honest implementation, not a stub.
- **`packages/geo`** — the gazetteer dataset. Adding a city is adding a row.
- **`apps/web`** — UI and route handlers only. Route handlers call services;
  they do not re-implement policy. A policy check in a component is a bug.

## Definition of done

A change is done when all of these are true:

- `pnpm lint` and `pnpm typecheck` pass.
- `pnpm test` passes, including `pnpm test:safety`.
- Any new rule that could be stated as an invariant *is* stated as one, with a
  test, and listed in [docs/SAFETY.md](docs/SAFETY.md).
- Any decision that closes an option is recorded as an ADR in `docs/adr/` with
  an explicit status term.
- Comments explain *why*, not *what*. The existing code does this; match it.
- No secret, credential, `.env` file or real personal data is added. All demo
  data stays synthetic and obviously fictional.

## Working with the demo build

The persona switcher (`apps/web/components/PersonaSwitcher.tsx`) is the
substitute for authentication. The demo cast is 14 fictional people defined in
`packages/db/src/demo/`. State lives in the server isolate: it resets. That is a
stated limitation, not a bug to work around with a hidden cache.

The demo banner reads `IS_DEMO_BUILD`. If you enable a production flag, the
banner must stop showing — a build that has real auth and still says "demo" is
lying to its users.
