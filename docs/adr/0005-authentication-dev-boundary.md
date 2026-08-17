# ADR-0005 — Authentication, and the development boundary

**Status: DEFERRED** for the implementation. **LOCKED** for the boundary: the
demo build ships no authentication and says so.

## Context

Real authentication is a product of its own — enrolment, recovery, session
management, device loss, support burden — and it is the single most dangerous
thing to leave half-finished. A half-implemented auth flow that *looks* real is
worse than no auth flow, because everyone downstream assumes the identity behind
a session means something.

The MVP needs to exercise every product and safety rule. It does not need real
identities to do that.

## Decision

### For now: a persona switcher, honestly labelled

The demo build ships a switcher over a fixed synthetic cast of 14 fictional
people (`PersonaSwitcher`, `DEMO_USERS`). It is presented openly, not hidden
behind a keyboard shortcut, because a demo that pretends to be a product is the
thing this ADR exists to prevent.

The session cookie is still hardened — `HttpOnly`, `SameSite=Lax`, `Path=/`,
value validated against the known cast — because the *shape* of the session
boundary is what all the other code is written against. Everything above
`currentUserId()` is written as if authentication were real, so that switching
it on changes one module.

### Later: passkeys first, OIDC second, email fallback

The recorded intent, in order of preference:

1. **Passkeys (WebAuthn)** — no shared secret to leak, no password to reuse,
   good on the mobile devices this product targets.
2. **OIDC**, for people who will not enrol a passkey. **Never a social login
   that harvests a credential**: `INV-SOCIAL-1` forbids accepting a third-party
   password, session token or cookie, under any circumstance.
3. **Email link**, as the accessible fallback.

Behind the `productionAuth` flag (`INDENOI_FEATURE_PRODUCTION_AUTH`), which
defaults to `false` and is enabled only by the exact string `'true'`
(`INV-DEMO-1`).

### The demo must know it is a demo

`IS_DEMO_BUILD` is true only while **every** production capability flag is off.
The banner, onboarding copy and identity screen all read it, so a build that
enables real auth stops describing itself as a demo automatically — a build with
real users that still says "demo" would be lying to them.

## Consequences

**Good.** Every safety invariant is exercised today without any real identity
existing. Nothing about the demo can be mistaken for a security control. The
blast radius of the shortcut is one module.

**Bad.** Nothing about production auth is proven: no enrolment flow, no recovery
path, no session-fixation testing, no rate limiting on sign-in. All of it is a
[release blocker](../RELEASE_CHECKLIST.md), and `productionAuth` must not be
enabled before an independent security review.

**Neutral.** Demo state lives in the server isolate and resets. Stated plainly
rather than papered over with a hidden cache.

## Alternatives considered

- **Ship a real auth library now.** Adds a dependency, a threat surface and a
  migration, to solve a problem the MVP does not have.
- **Passwords.** Reuse, resets, breach liability. No.
- **Social login as the primary path.** Imports an existing audience graph into
  a product whose premise is that audience is the wrong unit
  ([NON_GOALS.md](../NON_GOALS.md)) — and tempts exactly the credential
  collection `INV-SOCIAL-1` forbids.
- **Anonymous sessions with no identity at all.** Incompatible with vouching,
  hosting, blocking and moderation — all of which need a stable subject.
