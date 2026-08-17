# Non-goals

**Status:** OUT OF SCOPE items below are genuinely never-this-surface.
Items marked DEFERRED are decided *not now*. Items marked OPEN are undecided.
MVP cuts must not be written as eternal philosophy.

## OUT OF SCOPE — structural, not “maybe later”

### A trust score, level, karma or reputation number

[ADR-0003](adr/0003-trust-evidence-capabilities.md). There is deliberately no
`trustLevel` field anywhere.

### Precise person location

`INV-GEO-1`. No live people map, no exact person coordinates in public APIs,
no permanent GPS history. **Coarse legitimate attachment to a city/area is
required** and is not forbidden by this rule. Future travel-time relevance
using privacy-preserving / coarse inputs is allowed as a HYPOTHESIS.

### Hosts as platform moderators

[ADR-0010](adr/0010-moderation-hosts-and-blocks.md), `INV-HOST-2`.

### Identity documents in this system

`INV-KYC-1`, [ADR-0006](adr/0006-kyc-boundary.md).

### Third-party plaintext credential collection

`INV-SOCIAL-1`. No password, session token or cookie from another service.

### Blind address-book harvesting / uncontrolled bulk social-graph import

A privacy-hostile contact upload is forbidden. An **authorized Social Bridge**
(OAuth/OIDC, account-ownership proof, selected import, outbound sharing) is a
different thing and is **DEFERRED**, not forbidden.

### Public human rating / leaderboards / follower-count theatre

Appreciation is not a scoreboard.

### A global infinite recommendation feed that optimises time-spent

That is not the same as “no feed”. A local visual Discover surface, including
future Local Reels, is in scope as product direction.

## DEFERRED — not now, with a stated condition

| Item | Why not now | Revisit when |
|---|---|---|
| Adult romantic discovery / Mutual Signals | Current MVP has no romantic surface (`INV-ROMANCE-1` as an MVP constraint). Long-term: allowed, adult-only, private, reciprocal ([ADR-0013](adr/0013-romance-deferred-not-forbidden.md)) | Dedicated ADR + adversarial review; minors remain structurally isolated |
| Additional intents (Learn, Teach, Project, Activity, jobs) | Four intents are enough to test the loop | Evidence the four are insufficient |
| Local Reels / richer photo posts | Media pipeline not built | Upload obligations have owners ([ADR-0007](adr/0007-media.md)) |
| Social Bridges (OAuth, selected import, outbound share) | Not required to test the local loop | A provider and a privacy review exist |
| Production authentication | Honest demo switcher beats a half-auth | Real people will use it ([ADR-0005](adr/0005-authentication-dev-boundary.md)) |
| Live identity/age verification | No provider contract | Signed provider + DPIA ([ADR-0006](adr/0006-kyc-boundary.md)) |
| Media uploads | Transcoding, EXIF, CSAM, takedown, cost | Those obligations each have an owner |
| Persistent database (D1) | Schema exists; not provisioned | Human binds an account, or a synthetic demo explicitly needs it ([ADR-0011](adr/0011-persistence-boundary.md), [ADR-0015](adr/0015-public-synthetic-demo.md)) |
| Open unsolicited DMs | Current MVP is signal-gated (`INV-DM-1`) | Only with a superseding ADR; never by relaxing into spam |
| Neighbourhood-level scopes | Type supports it; unused | A launch city genuinely needs it *and* INV-GEO-1 is re-analysed |
| Native mobile apps | Web is mobile-first | Distribution, not capability, is the constraint |
| Internationalisation | Gazetteer is multilingual; UI is English | A non-anglophone launch |
| Rate limiting / abuse-at-scale | Genuinely missing | Before real-user production |
| Advertising / sponsorship | Not part of MVP | Owner decision; must stay separate from organic ranking |

## OPEN — not decided

- Whether the minimum age stays 15 in every jurisdiction.
- Whether vouches should decay with time.
- Whether a host exclusion should be appealable, and to whom.
- What a person may take with them when they delete an account.
- Whether advertising is ever introduced (strict conditions if yes).
- The exact “20 minutes away” reachability model (HYPOTHESIS, not a radius).
