# Autonomous continuation state

**Not a product document.**

## Timestamp

- 2026-09-08T07:00:00Z

## Repository

- Local path still: `/home/petranto/projects/indenoi`
- GitHub: **https://github.com/PetrAnto/qui** (**public**)
- Previous name `PetrAnto/indenoi` redirects
- Local directory was **not** renamed
- **State reconciled through:** PR #42. Query GitHub live for the current
  `main` SHA; this file intentionally does not self-assert the SHA produced by
  its own merge.
- **Deployed source SHA:** `615f8a3714abde7cccb03bd91b9890e4f376b5de`.
  The live synthetic demo is older than current `main`: subsequent changes
  include application code from PR #39 (`apps/web/components/Onboarding.tsx`),
  documentation/canon updates, tests and the D1 adapter. The demo has **not**
  been redeployed to include those later application changes.

## Landed this tranche

| PR | What |
|---|---|
| #27 | QUI canon (ADR-0013/14/15) |
| #28 | Worldwide city activation + Apache-2.0 / NOTICE / SECURITY / CONTRIBUTING |
| #31 | P0 city-selection fix: stale selection cleared on edit, last-write-wins search sequencer, deterministic e2e regressions (closes #30) |
| #35 | Deploy evidence: demo BUILD_ID verified by exact match |
| #36 | Canonical brand / product doctrine / landing / UX system (`docs/canon/*`) |
| #39 | City-search review follow-ups: deterministic e2e waits, search-error surface, aria-live selection status (closes the #31 review loop) |
| #41 | D1/Drizzle repository adapter + store-parity proof; ADR-0011 amended (closes #40) |

## Independent-review honesty

Every foundational/high-risk PR this tranche received a fresh-context
adversarial review via the subagent channel, which is working again:

- **#39** — review of the #31 city-selection fix returned no critical/high;
  seven findings (one medium: e2e false-green risk from a fixed sleep) all
  resolved in #39.
- **#41** — review of the D1 adapter returned no critical. Its one flagged-high
  (the FromRow mappers returning `demo: true`) was confirmed a **false
  positive** with evidence: `demo` is the literal type `readonly demo: true`
  (`packages/core/src/types.ts`), so a non-demo entity cannot exist to be
  masked. Real hardening from the same review landed: `tagsFor` IN()-list
  chunking against the D1 bound-parameter limit, facet-value dedupe in
  `putPerson`, and two new parity tests (message ordering by `createdAt` with
  distinct clocks; duplicate-facet survival). 58 DB-package tests are green in
  total; 18 tests in `packages/db/test/d1.test.ts` instantiate Miniflare and
  exercise the D1 adapter with the committed migrations.

## D1 persistence — CODE complete, flag fail-closed (ADR-0011)

The D1/Drizzle adapter exists and is parity-proven against the in-memory store.
**Enablement is unchanged**: `persistentDatabase` defaults off and only the
exact string `'true'` enables it (INV-DEMO-1); the D1 binding stays commented
out of `wrangler.jsonc`; the deployed demo still runs the in-memory store.

Not done (all human/account-owning decisions, RELEASE_CHECKLIST §4): wiring the
flag to the adapter (a sync→async `ports()` refactor across ~49 call sites plus
a seed-on-empty bootstrap decision), provisioning a hosted D1, applying the
migration live, backup/restore rehearsal, and re-running every invariant against
the hosted instance.

## Public synthetic demo — DEPLOYED (ADR-0015)

| Field | Value |
|---|---|
| Worker / project | `qui-demo` |
| Public URL | https://qui-demo.petrantonft.workers.dev |
| Currently live source SHA | `615f8a3714abde7cccb03bd91b9890e4f376b5de` (post-#31; owner-driven `build:opennext` + `deploy`) |
| Live worker version | `63feb033-524f-4166-a716-089d048f6ebd` (version 3), created 2026-08-19T08:39:47Z |
| Live BUILD_ID | `_DmrsNtvDU4UUV7Y6VqsZ` (was `KAxqnTcx2ljKucuyQXAIS` on `d0043f6`) |
| Runtime store | in-isolate memory (no D1) |
| Domain | `qui.social` **not attached** (zone not present in this Cloudflare account) |

Runtime evidence for the 2026-08-19 redeploy (checked 08:45Z, re-verified 09:00Z
after owner confirmation):

- All 5 `e2e/city-search.spec.ts` regressions pass **against the live URL**
  (20.3s, mobile viewport). These tests fail on pre-#31 behavior by
  construction, so green live is behavioral proof the fixed bundle is serving.
- `GET /welcome` → 200, demo banner, `noindex`; `/` unauthenticated → 307
  `/welcome`; `/api/cities?q=Tokyo` → world-index `geo:city:gn-1850147`;
  `q=Kilrush` → seed `geo:city:kilrush`.

Five-point deployment verification (2026-08-19T09:00Z):

1. **Source SHA** — GitHub `main` is exactly
   `615f8a3714abde7cccb03bd91b9890e4f376b5de`; the owner deployed from a clean
   detached worktree of that SHA.
2. **BUILD_ID — VERIFIED by exact match.** The owner rebuilt from a clean
   detached worktree of `615f8a3…` and compared:
   `SOURCE_SHA=615f8a3714abde7cccb03bd91b9890e4f376b5de`,
   `LOCAL_BUILD_ID=_DmrsNtvDU4UUV7Y6VqsZ`, `REMOTE_BUILD_ID=_DmrsNtvDU4UUV7Y6VqsZ`
   — identical. Corroborated by the 5/5 live regression pass (above), which
   fails on pre-#31 behavior by construction. (Earlier wording here said
   BUILD_ID equality was not a usable test because the id is generated per
   build; the owner's clean-worktree rebuild produced the same id, so the
   match is direct evidence.)
3. **Honest demo identity** — `/welcome` responds 200 with
   "Demo build — every account and post here is invented" and `noindex`.
4. **No real-user capability** — worker settings list the four flags as
   plain_text bindings; the deployed bundle was built from the `wrangler.jsonc`
   whose vars are all exactly `"false"`, and the demo banner is present, which
   per `INV-DEMO-1` cannot happen with any production flag on.
5. **No unrelated resources** — the deploy is `wrangler deploy` scoped to the
   `qui-demo` script in `wrangler.jsonc`; only `qui-demo` gained a version
   (v3, 2026-08-19T08:39:47Z). Account zone list unchanged: `qui.social`
   remains absent; no D1/KV/R2 bindings exist on the worker (ASSETS only).

Production flags on the Worker are all the exact string `"false"`
(`INDENOI_FEATURE_PRODUCTION_AUTH` / `LIVE_IDENTITY` / `MEDIA_UPLOADS` / `D1`),
confirmed live on 2026-08-17 against `/me` and the demo banner.

## Secret audit

- Tracked history: no AWS/GitHub/SSH/Cloudflare tokens
- No `.env` or credential files in git history
- GitHub Actions secrets: none listed
- Cloudflare credentials live only in `~/.secrets/*` and process env; never
  echoed into logs, tickets, or this file

## Remaining honest gaps

- `qui.social` zone absent from the Cloudflare account; workers.dev is the demo URL
- Internal `@indenoi/*` package names not renamed
- `AGENTS.md` still carries the old blanket deploy ban (host-protected write);
  ADR-0015 (LOCKED) is the operative policy
- Cities <15k not in the world dump (seed towns still searchable)
- `apps/web` `deploy` script ran `opennextjs-cloudflare deploy` only — a clean
  checkout has no `.open-next` bundle, so deploy-from-clean failed during the
  2026-08-19 redeploy and the owner ran `build:opennext` then `deploy`
  explicitly. Fixed in PR #33 (build && deploy, per the Cloudflare framework
  guide, with a guard test pinning the ordering).
