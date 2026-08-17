# Test evidence

**Status: BASELINE.** This page records what has actually been executed, with
real numbers, and states plainly what has not. It is meant to be re-run and
updated, not trusted indefinitely.

Recorded: **2026-08-16**, on Linux, Node >= 22.12, pnpm 10.33, vitest 3.2.7.

## Unit and integration suite — PASSING

`pnpm test` (vitest, 4 projects: `core`, `geo`, `db`, `web`).

```
Test Files  13 passed (13)
     Tests  159 passed (159)
  Duration  ~4.1s
```

| Project | File | Tests |
|---|---|---|
| core | `test/safety-invariants.test.ts` | 38 |
| core | `test/capabilities.test.ts` | 10 |
| core | `test/ranking.test.ts` | 7 |
| core | `test/analytics.test.ts` | 6 |
| core | `test/features.test.ts` | 4 |
| db | `test/flows.test.ts` | 16 |
| db | `test/demo-data.test.ts` | 9 |
| db | `test/onboarding.test.ts` | 7 |
| db | `test/schema.test.ts` | 7 |
| geo | `test/gazetteer.test.ts` | 11 |
| web | `test/routes.test.ts` | 22 |
| web | `test/api.test.ts` | 11 |
| web | `test/ui.test.ts` | 11 |

## Safety gate — PASSING

`pnpm test:safety` filters the same suite to the `INV-` invariant tests. **38
tests** covering the 17 invariants listed in [SAFETY.md](SAFETY.md):
`INV-AGE-1..4`, `INV-BLOCK-1`, `INV-DM-1`, `INV-HOST-1`, `INV-HOST-2`,
`INV-MOD-1`, `INV-KYC-1`, `INV-KYC-2`, `INV-SOCIAL-1`, `INV-GEO-1`,
`INV-PROFILE-1`, `INV-ROMANCE-1`, `INV-SUSPEND-1`, `INV-ANALYTICS-1`,
`INV-DEMO-1`, `INV-CACHE-1`.

CI runs this as a separate named job so a safety regression is legible as such.

## Red evidence — the tests were watched failing

`docs/evidence/red-run-1.txt` and `docs/evidence/red-run-2.txt` are captured
runs from before the implementation existed:

- **red-run-1**: 5 test files failed, 4 passed; 61 tests passing.
- **red-run-2**: 5 files failed, 8 passed; 7 failed / 104 passed (111 total),
  with failures of the form `TypeError: setProfileFacets is not a function`.

These are kept because a test suite that has only ever been observed green is
not evidence that it tests anything.

## End-to-end suite — PASSING

`e2e/mobile-smoke.spec.ts` contains **15 Playwright tests** on a Pixel 7
viewport, serial, against the production build (`next start`), covering: the
demo banner on every screen, age-baseline refusal, onboarding into Discover,
thumb-reachable tab bar, appreciation and score breakdown, unconditional city
switching, refusal of local publishing without a tie, signal-gated contact,
evidence-not-score profiles, report and block, the insights view, the persona
switcher, a minor's absence from adult people discovery, keyboard skip-link /
tab navigation, and `prefers-reduced-motion` honoured in CSS.

Recorded local runs:

```
2026-08-16  Running 13 tests using 1 worker — 13 passed (18.4s)
2026-08-17  Running 13 tests using 1 worker — 13 passed (19.6s)  # pre-hardening
```

Hardening branch local verification (2026-08-17):

```
pnpm test          → 160 passed
pnpm e2e           → 15 passed (21.0s)
pnpm verify:opennext → OpenNext build OK; workerd preview GET /welcome 200 with demo banner
```


Executed with the installed Playwright Chromium at a Pixel 7 viewport:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/home/petranto/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome pnpm e2e
```

The portable CI path still installs Chromium with Playwright before running the
same suite.

## OpenNext / workerd — scripted

```sh
pnpm verify:opennext
```

Builds the OpenNext Cloudflare worker bundle and optionally boots a short
preview smoke that asserts the demo banner is present. This is **not** a
Cloudflare account deploy. See `scripts/verify-opennext.sh` and
[RELEASE_REVIEW.md](RELEASE_REVIEW.md).

## Release review

Adversarial product / safety / operator review of main SHA
`2a42f08c9fdef7229dff1fb4af3be460841a7dc5` is recorded in
[RELEASE_REVIEW.md](RELEASE_REVIEW.md). Production deploy remains **NO-GO**.


## Static checks

`pnpm lint` (eslint 9, flat config, typescript-eslint) and `pnpm typecheck`
(`tsc --noEmit` per package) — both run on every change and in CI. See
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

## Not tested at all

Stated so nobody infers coverage from the numbers above:

- **No build has ever been deployed.** `opennextjs-cloudflare build` runs
  locally; `deploy` has never been executed and no Cloudflare account is
  configured.
- **No database exists.** `packages/db/migrations/0000_init.sql` (293 lines,
  SQLite/D1) is generated and checked, but has never been applied. Every test
  above runs against the in-memory repository.
- **No load, performance or concurrency testing.**
- **No security testing**: no penetration test, no dependency audit recorded,
  no external review.
- **No accessibility audit.** The e2e suite checks thumb reach, which is not the
  same thing.
- **No test with real users**, and therefore no evidence for anything in
  [EXPERIMENTS.md](EXPERIMENTS.md).
- **Production capability paths are untested by construction** — auth, live
  identity verification, media uploads and D1 are flagged off and have no
  implementation to test ([ADR-0005](adr/0005-authentication-dev-boundary.md),
  [ADR-0006](adr/0006-kyc-boundary.md), [ADR-0007](adr/0007-media.md),
  [ADR-0011](adr/0011-persistence-boundary.md)).
