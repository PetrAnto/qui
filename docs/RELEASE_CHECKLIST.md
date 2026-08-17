# Release checklist

**Status: BLOCKING for real-user production.** A public *synthetic* demo is a
different gate — see [ADR-0015](adr/0015-public-synthetic-demo.md).

Current state: **synthetic demo only.** No real-user production exists. The
e2e suite has completed locally and in CI; ignore older notes that said
otherwise.

## 0. Every time — the gate that runs on every change

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:safety
```

All four green, plus a completed `pnpm e2e` run (see
[TEST_EVIDENCE.md](TEST_EVIDENCE.md)).

## 1. Product and legal — BLOCKERS

- [ ] **Legal entity and controller identified.** A GDPR controller must exist
      before any personal data is processed. There is no entity today.
- [ ] **Privacy policy and terms published**, in the language of each launch
      city, written to be intelligible to a 15-year-old
      ([legal/AGE_BASELINE.md](legal/AGE_BASELINE.md)).
- [ ] **DPIA completed.** A social product processing minors' data with
      location-adjacent semantics is squarely in DPIA territory. It must
      explicitly assess the age-band model and the vouch mechanism.
- [ ] **Age baseline confirmed per launch jurisdiction.** 15 is the French
      digital-consent age; other EU states set 13–16 under GDPR Art. 8(1). The
      15+ baseline must be checked against every launch country, not assumed.
- [ ] **Legal basis for analytics on minors' accounts** decided and documented.
- [ ] **Retention and deletion policy** written and implemented — including what
      happens to a thread when one participant deletes their account.
- [ ] **Data subject request path** (access, rectification, erasure,
      portability) exists and has a named responder.
- [ ] **Reporting path to law enforcement** and a documented escalation for
      credible risk of harm to a minor.
- [ ] **GeoNames CC BY 4.0 attribution rendered in the shipped UI**, and every
      gazetteer id verified against the official export
      ([geo/PROVENANCE.md](geo/PROVENANCE.md)). Today every entry is
      `verified: false`.

## 2. Safety — BLOCKERS

- [ ] All 17 invariants in [SAFETY.md](SAFETY.md) pass against the *production*
      repository implementation, not only the in-memory one.
- [ ] **Moderation is staffed.** A queue with no human behind it is not
      moderation. Named people, working hours, escalation path, response-time
      target.
- [ ] **Rate limiting and abuse-at-scale defence** implemented — currently
      absent. Signals, responses, messages, invites, vouches, reports.
- [ ] **Account recovery** exists and cannot itself be used as a takeover path.
- [ ] **Vouch-ring detection** or an accepted, documented tolerance for it
      ([EXPERIMENTS.md](EXPERIMENTS.md), E3).
- [ ] Adversarial review against
      [threat-model/MINORS_AND_LOCAL_CONFLICT.md](threat-model/MINORS_AND_LOCAL_CONFLICT.md),
      by someone who did not write it.
- [ ] Independent security review of the auth and session implementation once
      `productionAuth` exists.

## 3. Capability flags — one deliberate decision each

Every flag defaults to `false`, and only the exact string `'true'` enables one
(`INV-DEMO-1`). Turning one on is a release decision with its own prerequisites.

| Flag | Env var | Prerequisites |
|---|---|---|
| `productionAuth` | `INDENOI_FEATURE_PRODUCTION_AUTH` | Passkey/OIDC implementation, session hardening, recovery flow, security review ([ADR-0005](adr/0005-authentication-dev-boundary.md)) |
| `liveIdentityVerification` | `INDENOI_FEATURE_LIVE_IDENTITY` | Signed provider contract, DPIA coverage, webhook signature verification, `INV-KYC-1` re-verified against the real payload ([ADR-0006](adr/0006-kyc-boundary.md)) |
| `mediaUploads` | `INDENOI_FEATURE_MEDIA_UPLOADS` | EXIF stripping, transcoding, CSAM detection and reporting obligations, takedown path, storage cost owner ([ADR-0007](adr/0007-media.md)) |
| `persistentDatabase` | `INDENOI_FEATURE_D1` | Provisioned D1, applied migration, backup and restore tested, invariants re-run against it ([ADR-0011](adr/0011-persistence-boundary.md)) |

**When any flag is on, the demo banner must be gone.** `IS_DEMO_BUILD` handles
this automatically — verify it visually anyway, because a build with real auth
that still says "demo" is lying to its users.

## 4. Infrastructure — human decisions, never automated

`wrangler.jsonc` deliberately carries **no account id and no D1 database id**,
so `wrangler deploy` cannot succeed against the wrong target by accident. Do not
"fix" this by adding a placeholder.

- [ ] Cloudflare account chosen and owned by the legal entity, by a human.
- [ ] D1 database created; `packages/db/migrations/0000_init.sql` applied; the
      D1 binding uncommented in `wrangler.jsonc` with a real id.
- [ ] Domain registered; TLS confirmed.
- [ ] Secrets provisioned through `wrangler secret` — never in `wrangler.jsonc`,
      never in the repo, never in an env file that is committed.
- [ ] Backups configured and a restore **actually tested**, not just enabled.
- [ ] Observability reviewed for what it logs; no request log may capture
      message content or anything that would defeat `INV-GEO-1`.
- [ ] Confirm no shared cache (R2/KV) has been placed in front of the app
      (`INV-CACHE-1`). This is the single highest-severity infrastructure
      mistake available here.

## 5. Launch shape

- [ ] One city first. Density decides whether the product works at all
      ([EXPERIMENTS.md](EXPERIMENTS.md), E6); a thin launch across many cities
      is a guaranteed failure that teaches nothing.
- [ ] A named person who can stop the launch, and a stated condition for doing
      so.
- [ ] Support address that a human reads.
- [ ] Rollback tested before it is needed.

## Explicitly not on this list

Growth targets and app-store presence. Advertising is **OPEN / not part of
MVP** ([NON_GOALS.md](NON_GOALS.md)) — do not treat its absence as a
permanent architectural ban.
