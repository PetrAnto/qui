# Release review — exact SHA

**Target SHA:** `2a42f08c9fdef7229dff1fb4af3be460841a7dc5`  
**Reviewed:** 2026-08-17  
**Reviewer role:** autonomous product skeptic + adversarial safety + operator (single session, independent of the original implementer narrative)  
**Status:** COMPLETE for demo/MVP-on-main. **Production deploy: BLOCKED** (see gates).

This document satisfies the review half of issue #20 against the landed main SHA.
It deliberately does **not** authorize production deploy.

## A — Product skeptic

### Is this a social product or a directory?

**Verdict: credible social loop, not a directory.**

Evidence on SHA:

- Discover is visual, ranked with auditable score breakdown (`Why am I seeing this?`).
- Content has inline contextual actions that create typed Signals (Ask / Offer / Join / Event).
- Contact is only via accepted Signal response → scoped thread (no compose on `/threads`).
- Host controls, block/report, appreciation, multi-city places, invites/vouches, and conversion-oriented insights exist.

### Residual product risks (not blockers for demo)

| Finding | Severity | Disposition |
|---|---|---|
| Persona switcher is not a retention loop; real auth is DEFERRED | Medium for launch | ACCEPT as demo boundary (ADR-0005). Do not fake production auth. |
| In-memory isolate state resets; multi-instance incoherent | High for multi-node | ACCEPT for demo; D1 gated (ADR-0011). |
| No rate limits / abuse quotas | High for real users | ACCEPT as release blocker; tracked in RELEASE_CHECKLIST. |
| Visual quality depends on generated art, not photos | Low for thesis test | ACCEPT; media uploads gated (ADR-0007). |
| Insights UI is internal-facing | Low | ACCEPT; matches instrumentation goal. |

No material product defect found that should reopen LOCKED ADRs.

## B — Adversarial safety / security

Attack attempts against the **domain + API behaviour** (unit/integration/e2e already encode many of these):

| Attack | Result on this SHA | Gate |
|---|---|---|
| Contact ineligible minor privately | Denied — INV-AGE-2; e2e confirms minor absent from adult people discovery | PASS |
| Unsolicited DM | Impossible — no constructor; threads UI has no compose | PASS |
| Bypass block via feed/profile | Block removes both directions from projections/ranking | PASS |
| Infer precise person location | No person lat/lng types; schema/tests forbid geo columns; Permissions-Policy denies geolocation | PASS |
| Inject KYC document material | Intake rejects named document fields (INV-KYC-1) | PASS |
| Fake live identity verification | Sandbox labelled; live path feature-gated (INV-KYC-2) | PASS |
| Shared-cache personalized leak | API `cache-control: private, no-store`; OpenNext cache adapters not wired (INV-CACHE-1) | PASS |
| Host exclusion rejoin | INV-HOST-1 enforced in policy | PASS |
| Trust score gaming | No trustLevel/karma field (structural + tests) | PASS |
| Demo misrepresented as live | Demo banner + INV-DEMO-1 exact `'true'` flags | PASS |

### Findings

| ID | Finding | Severity | Disposition |
|---|---|---|---|
| R-1 | CSP still allows `'unsafe-inline'` scripts (Next App Router bootstrap) | Medium | DEFER to production hardening (RELEASE_CHECKLIST nonce/middleware). Not a demo blocker. |
| R-2 | No application-layer rate limiting | High for prod | DEFER — release blocker before real users. |
| R-3 | Session is demo persona cookie, not production auth | High if flags flipped carelessly | ACCEPT — flags default false; AGENTS.md forbids flip without prerequisites. |
| R-4 | No independent external pentest | Medium | DEFER — external authority. |
| R-5 | Gazetteer `verified: false` on all rows | Low for demo | DEFER — verify before real launch (geo/PROVENANCE). |

**No critical open finding on the demo SHA.** High findings are release-gate items, not silent defects in the demo build.

## C — Architecture / operator

| Question | Answer |
|---|---|
| Survives Cloudflare runtime? | OpenNext build path present; local Next production + e2e green; workerd smoke script added in follow-up hardening. Full account deploy not executed. |
| D1 appropriate? | Schema + migration committed; not applied; flag off. Correct. |
| Service boundaries? | core pure; web handlers call services; policy centralized. |
| Queues? | Not introduced (no async workload yet). Correct. |
| Observability? | wrangler observability enabled when deployed; no sensitive payload logging in handlers. |
| VPS disappearance? | Production path is Workers-shaped; VPS not required at runtime. |
| Agent readability? | AGENTS.md + ADRs + SAFETY.md are explicit. |

### Operator blockers (external / human)

1. Cloudflare account binding + D1 id in `wrangler.jsonc` (deliberately absent).
2. Legal entity, privacy policy, DPIA, retention/DSR (RELEASE_CHECKLIST §1).
3. Staffed moderation, recovery, rate limits (RELEASE_CHECKLIST §2).
4. Domain (purchase forbidden to agents).

## Deploy decision

| Environment | Decision |
|---|---|
| Local demo | **GO** — already the default path |
| CI | **GO** — green on PR #21 and main push for this SHA |
| Cloudflare preview/staging/production | **NO-GO** until human account binding + legal blockers cleared |

Rationale: original mandate allows deploy when infrastructure permits **and** release gates pass. Repo AGENTS.md + RELEASE_CHECKLIST make autonomous provision/deploy a fail-closed action. Environment has no authenticated wrangler session and no project-bound D1.

## Sign-off

- Product loop: **accepted for demo MVP**
- Safety invariants: **green on SHA**
- Production release: **blocked on documented external/legal/infra gates**
- Exact next production step (human): choose CF account, create D1, apply migration, pass legal checklist, then flip flags one at a time.
