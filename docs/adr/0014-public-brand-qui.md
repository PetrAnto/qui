# ADR-0014 — Public brand is QUI; intended domain is qui.social

**Status: LOCKED.** Owner decision. `indenoi` is obsolete as a public identity.

## Context

The repository was bootstrapped under the internal codename `indenoi`. That
name leaked into README, HTML titles, package metadata and agent docs as if
it were the product.

The owner’s public brand is **QUI**. The primary intended domain is
**qui.social**.

## Decision

- Public product name: **QUI**.
- Primary intended domain: **qui.social**.
- Do not invent another product name.
- `indenoi` may survive only as a temporary internal identifier (npm workspace
  package names, existing cookie keys, local clone path) until a dedicated
  rename PR can change them without breaking imports.
- Public-facing copy, HTML metadata, repository description and documentation
  must say QUI.
- Do not purchase a domain. Do not claim `qui.social` is connected until
  ownership is independently verified in the same Cloudflare account.

## Consequences

**Good.** Build-in-public and the landing hero already speak QUI; the rest of
the repo stops arguing with them.

**Bad.** Internal `@indenoi/*` package names remain until a mechanical rename.
That is churn, not brand.

## Alternatives considered

- **Keep indenoi as the public name.** Rejected by owner.
- **Rename every identifier in this PR.** Rejected: high breakage, no user
  value. Follow-up allowed.
