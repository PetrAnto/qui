# ADR-0003 — Trust is evidence and capabilities, not a score

**Status: LOCKED.** Introducing a trust score, level or karma field requires a
superseding ADR and a product-owner decision.

## Context

Something has to decide who may publish into a place, host a gathering or vouch
for someone. The default industry answer is a reputation number, because it is
easy to compute, easy to display and easy to sort by.

It is also the wrong shape for this product. A single number invites "level 3
users may do X", ranks people against each other, and becomes a thing to farm.
In a small town it becomes a social hierarchy with a leaderboard.

## Decision

**There is no `trustLevel` field anywhere in this codebase, and adding one is
forbidden.**

Trust is a bundle of independent evidence:

- `Attestation` — a verified email, an attested age threshold, an attested local
  presence, an organisation role, all carrying a *result* and a *method*, never
  a score;
- `GeoAttachment` — a declared tie to a place (`resident`, `work_study`,
  `second_home`, `origin_family`, `repeated_presence`);
- `VouchEvidence` — a named person vouching, scoped to a place.

`deriveCapabilities(person, evidence)` computes a `Set<Capability>` from that
bundle **at read time**:

| Capability | Requires |
|---|---|
| `publish` | verified email |
| `publish_local` | verified email + local tie to that place, **or** 2 distinct vouchers there |
| `host` | 18+ and a local tie |
| `vouch` | 18+ and a local tie |
| `invite` | verified email |
| `respond_to_unknown_people` | verified email |
| `appear_in_people_discovery` | verified email, not distribution-restricted |

Three properties are part of the decision:

1. **Per-dimension, not ordered.** A person may hold `publish_local` in one city
   and nothing in another. There is no ranking of people.
2. **Derived, never stored.** A persisted capability set goes stale the moment
   an account is suspended or an attestation is revoked. A suspended account
   holds *no* capability at all.
3. **A vouch grants the voucher no power over the person vouched for.** It is
   one trust input — not identity verification, not proof of residence, and not
   a relationship of authority.

Publishing *into* a place needs evidence because it is what lets a stranger
speak as a local. **Exploring a city needs none**
([ADR-0004](0004-geography.md)).

## Consequences

**Good.** Nothing to farm, nothing to display as status, no leaderboard.
Capabilities are explainable in one sentence each ("you can publish here because
you said you live here"), and every denial has a named reason
(`no_local_attachment`, `missing_capability`) rather than a bare `false`.

**Bad.** More code than a number comparison, and a UI problem: "what can I do
here and why not" has to be answered per dimension. The two-voucher substitute
is exploitable by a small closed group vouching for each other; detection is
unbuilt ([EXPERIMENTS.md](../EXPERIMENTS.md), E3).

**Neutral.** Recomputing on read costs a query. At this scale it is free, and it
is the only way the set is never wrong.

## Alternatives considered

- **A numeric trust score.** Rejected above. This is the decision.
- **Roles (newcomer / local / trusted).** A ladder with words instead of
  numbers; same hierarchy, less honest about it.
- **Stored capability sets.** Faster, and wrong after any state change.
- **Vouches as the only path to local publishing.** Rejected: it hands a local
  in-group a veto over who may speak in their town
  ([threat-model/MINORS_AND_LOCAL_CONFLICT.md](../threat-model/MINORS_AND_LOCAL_CONFLICT.md),
  T8).
