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

Runtime evidence for the 2026-08-19 redeploy (checked 08:45Z):

- All 5 `e2e/city-search.spec.ts` regressions pass **against the live URL**
  (20.3s, mobile viewport). These tests fail on pre-#31 behavior by
  construction, so green live is behavioral proof the fixed bundle is serving.
- `GET /welcome` → 200, demo banner, `noindex`; `/` unauthenticated → 307
  `/welcome`; `/api/cities?q=Tokyo` → world-index `geo:city:gn-1850147`;
  `q=Kilrush` → seed `geo:city:kilrush`.

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
- `apps/web` `deploy` script runs `opennextjs-cloudflare deploy` only — a clean
  checkout has no `.open-next` bundle, so deploy-from-clean fails. The 2026-08-19
  redeploy had to run `build:opennext` then `deploy` explicitly. Fix (build &&
  deploy, per Cloudflare framework guide) follows as its own change.
