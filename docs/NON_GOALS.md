# Non-goals

**Status: LOCKED** for everything marked OUT OF SCOPE. Items marked DEFERRED are
decided *not now*, and each names what would have to be true to revisit it.

A non-goal is not a backlog item. It is a decision to keep the product a
particular shape, and things that "seem obviously missing" are usually missing
on purpose.

## OUT OF SCOPE — not deferred, not planned

### A romantic or dating surface
`INV-ROMANCE-1`, [ADR-0009](adr/0009-signal-intent-scope.md). There is no
romantic intent in the signal vocabulary and no romantic capability. This is
structural: the `SIGNAL_TYPES` union cannot express one. A product that mixes
"lend me a drill" with courtship acquires a different, much harder safety
problem — one that is acute in a product that also serves 15–17 year olds.

### A trust score, level, karma or reputation number
[ADR-0003](adr/0003-trust-evidence-capabilities.md). There is deliberately no
`trustLevel` field anywhere. A single number invites "level 3 users may do X",
which is the social-credit shape the product rejects. Trust stays
multidimensional evidence, and a person may be strong in one dimension and
absent in another.

### Engagement optimisation
No infinite feed, no streaks, no notification pressure, no time-spent metric.
Instrumentation exists to answer *where is this starting to work*, not *how long
did people stare at it* (`INV-ANALYTICS-1`). The success signal is a local
outcome recorded, not DAU.

### Person-level location
`INV-GEO-1`. No live location, no check-ins, no "people near you" by distance,
no coordinates attached to a person — ever, at any granularity. Places have
centroids; people do not. Proximity in this product means *a declared tie to an
administrative scope*, not metres.

### Hosts as moderators
[ADR-0010](adr/0010-moderation-hosts-and-blocks.md), `INV-HOST-2`. A host's
power stops at the edge of their own gathering. There is no path by which
hosting many events accrues platform authority.

### Identity documents
`INV-KYC-1`, [ADR-0006](adr/0006-kyc-boundary.md). No document image, document
number, full date of birth or biometric ever enters the system, under any
feature flag. If verification happens, a provider holds the document and this
system receives a yes/no and an opaque reference.

### Third-party credential collection
`INV-SOCIAL-1`. No password, session token or cookie from another service is
ever accepted, including for the seemingly benign purpose of importing contacts.

### Contact-list import and social-graph import
No address-book upload, no friend-finder from another network. It would import
the shape of an existing audience into a product whose premise is that audience
is the wrong unit.

### Public engagement counters
No follower counts, no view counts, no leaderboards. Appreciation exists as a
private-ish acknowledgement between two people, not as a scoreboard.

### An advertising business model
Not the plan, and the data minimisation choices above foreclose it. Deciding
otherwise would invalidate `INV-ANALYTICS-1` and `INV-GEO-1` simultaneously.

## DEFERRED — not now, with a stated condition

| Item | Why not now | Revisit when |
|---|---|---|
| Production authentication (passkeys → OIDC → email) | A half-implemented auth flow is worse than an honest demo switcher. [ADR-0005](adr/0005-authentication-dev-boundary.md) | The product is going in front of a real person. It is a release blocker. |
| Live identity/age verification | No provider contract exists. Stubbing one to return "verified" would be a lie in code. [ADR-0006](adr/0006-kyc-boundary.md) | A provider is signed and a DPIA covers it. |
| Media uploads | Uploads mean transcoding, EXIF stripping, CSAM scanning, takedown and storage cost — a product of its own. [ADR-0007](adr/0007-media.md) | Those five obligations each have an owner. |
| Persistent database (D1) | Schema and migration exist; nothing has been provisioned. [ADR-0011](adr/0011-persistence-boundary.md) | A human with an account decides to provision one. |
| Neighbourhood-level scopes | The type supports `neighbourhood`; the gazetteer has none. Sub-city granularity narrows a person's location and needs its own analysis against `INV-GEO-1`. | A launch city genuinely needs it. |
| Additional intents (Learn, Teach, Project) | Extending `SIGNAL_TYPES` is how they would arrive. Four is enough to test the loop. | Evidence that the four are insufficient. See [EXPERIMENTS.md](EXPERIMENTS.md). |
| Native mobile apps | The web build is mobile-first and the smoke suite runs on a phone viewport. | Distribution, not capability, becomes the constraint. |
| Internationalisation | The gazetteer spans six countries; the interface does not yet. | A non-francophone launch city. |
| Rate limiting and abuse-at-scale defence | Genuinely missing, not a decision. A release blocker. | Before any public exposure. See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). |

## OPEN — not decided

Do not implement a default for these and call it a decision.

- Whether the minimum age stays 15 in every jurisdiction, or varies by country.
  See [legal/AGE_BASELINE.md](legal/AGE_BASELINE.md).
- Whether vouches should decay with time.
- Whether a host exclusion should be appealable, and to whom.
- What, if anything, a person may take with them when they delete an account.
