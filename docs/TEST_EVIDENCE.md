# Test evidence

**Status: BASELINE.** This page records what has actually been executed, with
real numbers, and states plainly what has not. It is meant to be re-run and
updated, not trusted indefinitely.

Recorded: **2026-08-16**, on Linux, Node >= 22.12, pnpm 10.33, vitest 3.2.7.
Updated: **2026-08-19** (counts re-run on `0692bc1`; live-deploy correction).
Updated: **2026-09-25** (branch `feat/activity-foundations`: participation
fixes, `INV-OUTCOME-1`, pure activity modules; counts below re-run on that
branch, Node 22.23.1, `vitest run --maxWorkers=1`; re-run after the review
rounds on `b904670` and `258dd44`).
Updated: **2026-09-25** (branch `feat/activity-search-preview`: activity search,
results and proposal preview; same command).

## Unit and integration suite — PASSING

`pnpm test` (vitest, 4 projects: `core`, `geo`, `db`, `web`).

```
Test Files  25 passed (25)
     Tests  361 passed (361)
```

| Project | File | Tests |
|---|---|---|
| core | `test/safety-invariants.test.ts` | 49 |
| core | `test/activity.test.ts` | 45 |
| core | `test/search-input.test.ts` | 9 |
| core | `test/capabilities.test.ts` | 10 |
| core | `test/ranking.test.ts` | 7 |
| core | `test/analytics.test.ts` | 6 |
| core | `test/features.test.ts` | 4 |
| db | `test/d1.test.ts` | 20 |
| db | `test/flows.test.ts` | 16 |
| db | `test/participation.test.ts` | 29 |
| db | `test/proposals.test.ts` | 16 |
| db | `test/search.test.ts` | 11 |
| db | `test/signal-visibility.test.ts` | 13 |
| db | `test/demo-data.test.ts` | 9 |
| db | `test/onboarding.test.ts` | 8 |
| db | `test/schema.test.ts` | 7 |
| geo | `test/gazetteer.test.ts` | 14 |
| web | `test/routes.test.ts` | 22 |
| web | `test/ui.test.ts` | 14 |
| web | `test/api.test.ts` | 20 |
| web | `test/activity-draft.test.ts` | 14 |
| web | `test/signal-page.test.ts` | 5 |
| web | `test/landing-hero.test.ts` | 6 |
| web | `test/search-sequence.test.ts` | 6 |
| web | `test/deploy-script.test.ts` | 1 |

`test/activity.test.ts` covers pure functions that are not yet wired into any
route or UI ([ACTIVITY_PROPOSALS.md](ACTIVITY_PROPOSALS.md)). The exact commit
these counts were verified on is recorded in the pull request that introduces
this entry; a file cannot name the SHA of the commit that contains it.

## Safety gate — PASSING

`pnpm test:safety` filters the same suite to the `INV-` invariant tests. **49
tests** in `safety-invariants.test.ts` cover the 19 invariants listed in [SAFETY.md](SAFETY.md):
`INV-AGE-1..4`, `INV-BLOCK-1`, `INV-DM-1`, `INV-HOST-1`, `INV-HOST-2`,
`INV-MOD-1`, `INV-KYC-1`, `INV-KYC-2`, `INV-SOCIAL-1`, `INV-GEO-1`,
`INV-PROFILE-1`, `INV-ROMANCE-1`, `INV-SUSPEND-1`, `INV-OUTCOME-1`, `INV-PROPOSAL-1`,
`INV-ANALYTICS-1`, `INV-DEMO-1`, `INV-CACHE-1`. The filter also matches the
`INV-DEMO-1` and `INV-ANALYTICS-1` tests in `features.test.ts` and
`analytics.test.ts`, so the gate reports more than 49.

CI runs this as a separate named job so a safety regression is legible as such.

## Red evidence — the tests were watched failing

`docs/evidence/red-run-1.txt` and `docs/evidence/red-run-2.txt` are captured
runs from before the implementation existed:

- **red-run-1**: 5 test files failed, 4 passed; 61 tests passing.
- **red-run-2**: 5 files failed, 8 passed; 7 failed / 104 passed (111 total),
  with failures of the form `TypeError: setProfileFacets is not a function`.

These are kept because a test suite that has only ever been observed green is
not evidence that it tests anything.

2026-09-25: the 13 tests in `packages/db/test/participation.test.ts` were run
against `main`'s `services/write.ts` before the fix: **11 failed, 2 passed**.
The 2 that pass assert behaviour the fix must keep: the host, joined
participants and accepted responders can still report an outcome, and a
responder who already joined is not counted twice.

2026-09-25, review round on `b904670`: 16 new regressions were added for
three reproduced defects.
- R1: an accepted-then-removed participant could still report an outcome.
- R2: existing membership bypassed current eligibility.
- R3: equipment was checked against the whole flexible overlap instead of an
  activity-length interval.

Run against `b904670`'s code, **14 failed and 2 passed**. The 2 that pass
assert preserved behaviour: an eligible member's retry into a full activity
is still a no-op success, and the host and accepted Offer responder can still
report.

2026-09-25, Codex review `5320398217` on `258dd44`: 15 new regressions for
three findings.
- P1: Ask/Offer acceptance did not revalidate lifecycle and host exclusion.
- P2: non-Latin practice keys collapsed to an empty key.
- P2: preferred availability depended on input order.

Run against `258dd44`'s code, **10 failed and 5 passed**. Three of the five
assert preserved rules (suspension, the private-thread age rule, a partial
preferred overlap not counting). The other two (same non-Latin practice,
canonical equivalence) passed only because both sides normalised to an empty
key, which is the defect itself.

2026-09-26, correction round on PR #46 at `5912b5f`: regressions for four
defects.
- INV-SUSPEND-1 was not enforced in the Signals list or in search.
- A stored draft with an invalid time zone crashed `/search`.
- A failed search request left the page stuck.
- The preview made statements the inputs did not support.

Run against `5912b5f`, **11 unit tests failed**:
- 1 policy test (`canViewSignal`);
- 2 draft tests (the invalid zone was accepted);
- 4 preview tests;
- 4 service-level visibility tests (suspended or restricted authors listed and
  counted).

The 3 that passed assert preserved behaviour: an active author stays visible,
and a suspended or restricted author still sees their own signal.

2026-09-26, direct access at `a1b0e26`. `getSignalDetail` still returned a
suspended author's signal to other viewers, and an adults-only signal to a
minor. The rendered page then showed its title and body above the refusal.

Run against `a1b0e26`, **5 tests failed**:
- 1 policy test (`canReadSignal` did not exist);
- 2 service tests (suspended author, adults-only for a minor);
- 2 rendered-page tests (`app/signals/[id]/page.tsx` rendered the forbidden
  title and body instead of calling `notFound()`).

Codex review `5325186342` on `ecbac11` raised two findings.
- A restored draft was sent on any signed-in visit.
- City suggestions outlived their query, and a failed lookup was unhandled.

The regressions were run against `ecbac11`: **4 unit tests** (the resume
marker) and **all 5 e2e scenarios** failed. In the e2e, a reload re-sent the
search, an ordinary visit sent it twice, an abandoned sign-in fired it later,
stale suggestions stayed, and a failed lookup showed no message.

A sixth regression, a minor seeing an adults-only signal listed on its author's
profile, failed before the one-line fix in `getProfile`. The tests that passed
throughout assert preserved behaviour: the author's own access, a restricted
author's direct link, an adult's access, and the block and removal rules.
Against the `5912b5f` production build, all **3 changed or new e2e tests
failed**: the invalid-zone page crashed, the retry button stayed disabled, and
the old preview wording was shown.

## End-to-end suite — PASSING

`e2e/mobile-smoke.spec.ts` contains **16 Playwright tests** on a Pixel 7
viewport, serial, against the production build (`next start`), covering: the
demo banner on every screen, age-baseline refusal, onboarding into Discover,
thumb-reachable tab bar, appreciation and score breakdown, unconditional city
switching, refusal of local publishing without a tie, signal-gated contact,
evidence-not-score profiles, report and block, the insights view, the persona
switcher, a minor's absence from adult people discovery, keyboard skip-link /
tab navigation, and `prefers-reduced-motion` honoured in CSS.

`e2e/city-search.spec.ts` adds **5 regression tests** for the city-selection
defect (#30, fixed in #31): stale selection cleared on edit, a slow older
search never overwriting newer results, clearing not undone by a late
response, no reopening after selection, and switcher persistence across
reload. The races are made deterministic by holding specific HTTP responses at
the network layer.

`e2e/activity-search.spec.ts` adds **9 tests** for activity search:
- anonymous search → preview → reload → demo onboarding → back on `/search`
  with every input restored and results shown;
- no results still offers the proposal preview, worded only from what was
  supplied;
- the entry point from Signals;
- a stored draft with an invalid time zone is dropped without a crash;
- a failed search releases the page, keeps the draft, retries successfully,
  and clears stale results while a replacement request runs;
- an ordinary visit or reload restores a draft without sending it, and the
  onboarding return searches exactly once;
- an abandoned sign-in never fires the search later;
- city suggestions are cleared when the text changes, and an outdated
  response never brings them back;
- a failed city lookup offers a retry that works.

The journey tests assert that no publish, join or respond request is sent.

`e2e/activity-publish.spec.ts` adds **3 tests** for publishing a proposal
(ADR-0016):
- search with no prior match → one explicit Publish, clicked twice → the
  created activity:
  - it shows as hostless, with its windows as possible times and the
    preference kept;
  - it has no join control;
  - it is listed once in Signals and found again by search;
- publication refused in a city with no tie — draft kept, nothing created;
- a failed publication retried without a duplicate.

Total e2e: **33 tests**. Where they were executed for this branch is recorded in
its pull request.

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

Post-#31 verification (2026-08-19):

```
pnpm test          → 177 passed (16 files)
CI (main 615f8a3)  → lint/typecheck/test, safety invariants, mobile smoke all green
live demo          → 5/5 city-search regressions pass against
                     https://qui-demo.petrantonft.workers.dev (they fail on
                     pre-#31 behavior by construction)
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

- **Real-user production has never been deployed.** The public **synthetic
  demo** has: `qui-demo` on Cloudflare Workers has served
  `https://qui-demo.petrantonft.workers.dev` since 2026-08-17, currently built
  from `615f8a3` (evidence in [AUTONOMOUS_STATE.md](AUTONOMOUS_STATE.md)).
  All production capability flags remain exactly `"false"` on the worker.
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
