# ADR-0015 — Public synthetic demo may be deployed; real-user production stays fail-closed

**Status: LOCKED.** Owner override of the previous blanket “agents must never
touch Cloudflare” rule in AGENTS.md.

## Context

The autonomous MVP tranche recorded production as NO-GO and encoded that as a
hard agent prohibition on any provision/deploy. That was too strong. A
**synthetic public demo** is compatible with build-in-public and does not
require a legal entity, KYC contract or real-user persistence.

Real-user production is a different thing.

## Decision

### Public synthetic demo — agents MAY

An agent MAY provision and deploy a **project-specific** Cloudflare Workers /
OpenNext demo when all of the following are true:

1. No real-user account creation is enabled (`productionAuth` remains false).
2. No live KYC runs (`liveIdentityVerification` remains false).
3. No real personal-data persistence (`persistentDatabase` remains false
   unless the store is still synthetic and reset-safe).
4. All demo identities and posts are synthetic; editorial landing photos are
   labelled as not members.
5. No unrelated Cloudflare zone or resource is modified.
6. CI / build / workerd gates pass.
7. No secret is written into the repo, logs, or public tickets.

Prefer an in-memory/synthetic isolate over provisioning D1 for the public
demo.

If `qui.social` is independently verified as owned in the same account, a
non-destructive mapping may be considered. Otherwise use the generated
Workers / Cloudflare demo URL. Do not buy a domain. Do not touch unrelated DNS.

### Real-user production — FAIL-CLOSED

Remain fail-closed until, as applicable:

- production auth;
- privacy / legal / controller requirements;
- persistence and tested backups;
- abuse / rate limiting;
- staffed moderation and incident response;
- account recovery;
- KYC provider/contracts where required.

A demo that still says “demo” while those flags are off is honest.
A build with a production flag on that still says “demo” is a lie (`INV-DEMO-1`).

## Consequences

**Good.** Build-in-public can show a running product without pretending it is
production.

**Bad.** The previous self-block made “cannot deploy” look like an external
blocker. It was a self-created rule. This ADR removes that confusion.

## Alternatives considered

- **Keep the blanket ban.** Rejected by owner.
- **Deploy production now.** Rejected: legal and safety gates are real.
