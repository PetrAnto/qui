# Autonomous continuation state

**Not a product document.**

## Timestamp

- 2026-08-17T16:45:00Z

## Repository

- Local path still: `/home/petranto/projects/indenoi`
- GitHub: **https://github.com/PetrAnto/qui** (**public**)
- Previous name `PetrAnto/indenoi` redirects
- **origin/main SHA:** `a339b0d79102f3eda0c1042fbb2fc43847f33d94`
- Description: QUI — a local-first human social product. Synthetic demo. Not production.
- Homepage field: https://qui.social (not independently verified as bound)

## Landed this tranche

| PR | What |
|---|---|
| #27 | QUI canon (ADR-0013/14/15) |
| #28 | Worldwide city activation + Apache-2.0 / NOTICE / SECURITY / CONTRIBUTING |

## Secret audit

- Tracked history (15 commits at audit): no AWS/GitHub/SSH/Cloudflare tokens
- No `.env` or credential files in git history
- GitHub Actions secrets: none listed
- Hidden/gitignored matches were **not** committed

## Public synthetic demo

**Not deployed.** No `CLOUDFLARE_*` / `WRANGLER_*` / `CF_*` credentials in this environment. `wrangler.jsonc` still has no account id. Real-user production remains fail-closed (ADR-0015).

## Remaining honest gaps

- `qui.social` domain ownership not independently verified
- No Cloudflare account bound here
- Internal `@indenoi/*` package names not renamed
- `AGENTS.md` still has the old blanket deploy ban (host-protected write)
- Cities <15k not in the world dump (seed towns still searchable)
