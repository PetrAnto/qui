# Safety

**Status: LOCKED.** Every invariant on this page is a rule the product does not
trade against features. Weakening one requires a superseding ADR and a recorded
product-owner decision — not a pull request.

Each `INV-` identifier below corresponds to a `describe()` block in
`packages/core/test/safety-invariants.test.ts` (38 tests). CI runs them twice:
once inside the full suite, and once as a separate named gate
(`pnpm test:safety`), so that a failure is legible as *a safety failure* rather
than as one red line among many.

## The three enforcement strategies

Ranked by strength. Prefer the strongest one available.

1. **Structural** — the type cannot express the unsafe thing. No domain type
   attached to a person carries coordinates; no attestation type can hold a
   document image, a document number or a full date of birth. A check can be
   forgotten. A type that cannot express the thing cannot be.
2. **Central policy** — the rule lives once, in `packages/core/src/policy/`,
   and every caller goes through it. Route handlers and components never
   re-derive a policy decision.
3. **Filtering at projection** — unsafe material is removed before it reaches a
   projection, never demoted or hidden in the UI. Something that is only hidden
   client-side is not removed.

## The invariants

### Age

| ID | Rule | Enforced in |
|---|---|---|
| `INV-AGE-1` | No account below the minimum age. `ageBandFromAge` returns `null` rather than a band, so there is no code path that produces an under-15 actor. | `policy/age.ts` |
| `INV-AGE-2` | A private, two-person space never opens across age bands. Adults and minors can still meet in *hosted group* contexts, where a host is present and the exchange is not private. | `policy/age.ts`, `policy/interaction.ts` |
| `INV-AGE-3` | Minors do not appear in people discovery for adults. | `policy/access.ts`, projections |
| `INV-AGE-4` | Adult-audience content never reaches a minor surface. | `policy/age.ts`, projections |

`INV-AGE-2` is deliberately blunt. A rule an adult can talk their way around is
not a rule, and the MVP has no feature that requires cross-band privacy.

The age *threshold* (15) is **BASELINE**, not LOCKED — see
[legal/AGE_BASELINE.md](legal/AGE_BASELINE.md). The invariants above are LOCKED
regardless of where the threshold lands.

### Contact and messaging

| ID | Rule | Enforced in |
|---|---|---|
| `INV-DM-1` | No unsolicited direct messages. A thread exists only as a consequence of an accepted response to a live signal. There is no constructor for a context-free thread and no service that opens one. | `types.ts` (structural), `policy/interaction.ts`, `services/write.ts` |

A pending or declined response does not open a thread. A closed or expired
signal does not accept a response.

### Blocking

| ID | Rule | Enforced in |
|---|---|---|
| `INV-BLOCK-1` | A block removes the account in both directions, regardless of who pressed the button: profile, discovery, content, appreciations, signal eligibility, new threads, participant lists. An existing thread freezes. Blocked content is **removed from the ranked feed, not demoted**. | `policy/graph.ts`, `policy/access.ts`, `ranking.ts`, projections |

Symmetry is not politeness. An asymmetric block leaves the blocked person able
to watch, which is the exact failure the button exists to prevent.

### Hosting and moderation

| ID | Rule | Enforced in |
|---|---|---|
| `INV-HOST-1` | A host exclusion prevents rejoining *that object* and any further response on it — permanently. | `policy/interaction.ts` |
| `INV-HOST-2` | Host power is local to the hosted object. It is granted only to that object's creator, it does not follow the excluded person anywhere else, and it never becomes moderation. | `policy/interaction.ts` |
| `INV-MOD-1` | Moderation material is private to the moderation function. A report is visible to its author and to moderators — never to the reported person. Machine triage labels may be attached; they never decide. | `policy/access.ts`, `services/write.ts` |
| `INV-SUSPEND-1` | A suspended account and its content disappear and it can respond to nothing; it retains read access to its own state so it can appeal. A `distribution_restricted` account keeps its voice but loses amplification — out of others' feeds and out of people discovery, still visible to its author. | `policy/capabilities.ts`, `policy/access.ts` |

### Identity and credentials

| ID | Rule | Enforced in |
|---|---|---|
| `INV-KYC-1` | Identity-document material cannot enter the system. The intake boundary accepts a provider reference and a threshold result, and rejects document and biometric fields **by name** rather than dropping them silently. | `identity/intake.ts` (structural + intake) |
| `INV-KYC-2` | A live verification that never happened cannot be recorded. Sandbox attestations are labelled `provider_sandbox` so no derived capability can be mistaken for a real check. | `identity/provider.ts` |
| `INV-SOCIAL-1` | Third-party passwords, session tokens and cookies are never accepted. Unknown fields are rejected, not silently ignored. | `identity/intake.ts` |

### Location

| ID | Rule | Enforced in |
|---|---|---|
| `INV-GEO-1` | No person-level location ever leaves the domain. A *place* may carry a centroid; a *person* never does. No public profile, post or signal projection exposes a coordinate or an identity field. | `types.ts` (structural), projections |

This is the invariant with the most tests behind it, because it is the one whose
violation is irreversible: a coordinate that leaked is a coordinate that leaked.

### Profile and data minimisation

| ID | Rule | Enforced in |
|---|---|---|
| `INV-PROFILE-1` | Private trust state stays private. Attestations are reduced to coarse booleans in any public projection — never the method, provider reference, threshold or timestamps. | `projections.ts` |
| `INV-ANALYTICS-1` | The analytics event shape is closed: 20 named events, no free-form payload. Time-spent is not collected. | `analytics/events.ts` |

### Product scope (current MVP surface)

| ID | Rule | Enforced in |
|---|---|---|
| `INV-ROMANCE-1` | **Current MVP constraint:** this build has no romantic surface — no romantic intent in `SIGNAL_TYPES`, no romantic capability. This is not a claim that QUI can never have adult-only Mutual Signals. See [ADR-0013](adr/0013-romance-deferred-not-forbidden.md). | `types.ts` |

### Build posture

| ID | Rule | Enforced in |
|---|---|---|
| `INV-DEMO-1` | Every production capability flag defaults to off, and only the exact string `'true'` enables one — `'yes'`, `'1'` and `'TRUE'` do not. A build with any flag on must stop describing itself as a demo. | `config/features.ts` |
| `INV-CACHE-1` | No shared response cache. Every route is dynamic and every response is personalised through the viewer's blocks, age band and capabilities. No R2 or KV cache is wired in front of it. | `apps/web/open-next.config.ts`, route handlers |

`INV-CACHE-1` deserves emphasis: an edge cache in front of a personalised feed
is the single easiest way to serve one person's view to another, and it would
defeat `INV-BLOCK-1`, `INV-AGE-3` and `INV-AGE-4` simultaneously and silently.

## What is *not* claimed

Stated plainly, so nobody reads this page as more than it is:

- No penetration test, no external security review, no privacy impact
  assessment has been performed.
- No adversarial red-team has been run against the moderation model.
- The invariants are verified against the in-memory repository. A future D1
  implementation must re-satisfy every one of them
  ([ADR-0011](adr/0011-persistence-boundary.md)).
- Rate limiting, abuse-at-scale defence, spam handling and account-recovery
  flows are **DEFERRED** and are release blockers, not launch niceties. See
  [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).
