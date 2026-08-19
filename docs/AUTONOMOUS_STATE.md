# Autonomous continuation state

**Not a product document.**

## Timestamp

- 2026-08-19T08:10:00Z

## Repository

- Local path still: `/home/petranto/projects/indenoi`
- GitHub: **https://github.com/PetrAnto/qui** (**public**)
- Previous name `PetrAnto/indenoi` redirects
- Local directory was **not** renamed
- **origin/main SHA:** `615f8a3714abde7cccb03bd91b9890e4f376b5de`

## Landed this tranche

| PR | What |
|---|---|
| #27 | QUI canon (ADR-0013/14/15) |
| #28 | Worldwide city activation + Apache-2.0 / NOTICE / SECURITY / CONTRIBUTING |
| #31 | P0 city-selection fix: stale selection cleared on edit, last-write-wins search sequencer, deterministic e2e regressions (closes #30) |

## PR #31 review honesty note

PR #31 was merged **without an independent reviewer**. The external Codex
review bot was usage-limited (its only PR comment says so), and the agent-run
reviewer subagent hung permanently (`spawn_agent` never returned; the daemon
was terminated). Substitute: a documented adversarial self-review of the full
diff plus CI on the exact head (`92e9f458…`, tree-identical to the squash
merge `615f8a3…`). The subagent channel should be treated as unreliable until
proven otherwise.

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
2. **BUILD_ID** — live serves `_DmrsNtvDU4UUV7Y6VqsZ`, distinct from the
   `d0043f6` deploy's `KAxqnTcx2ljKucuyQXAIS`. Next.js BUILD_ID is a per-build
   random hash, so equality with a local rebuild is not the test; the changed
   id plus the live regression pass (above) is the evidence the serving bundle
   is the #31-fixed tree.
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
