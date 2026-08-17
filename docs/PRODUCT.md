# Product

**Status of this document: BASELINE.** It describes the MVP as built. The
surface is expected to change; the safety boundaries it rests on are LOCKED and
listed in [SAFETY.md](SAFETY.md).

## The problem

Most people can name their city but not five people in it they could actually
ask for something. Existing social products optimise for audience — reach,
followers, engagement — which is orthogonal to, and often corrosive of, the
thing that makes a place liveable: a small number of specific, reciprocal ties
with people who are physically near you.

The bet: what is missing is not another feed, but a low-cost, low-embarrassment
way to say a concrete thing out loud in a place and have a local answer it.

## Who it is for

People with a real, continuing tie to a specific place — residents, people who
work or study there, people who grew up there and come back, people who split
their year. The gazetteer starts in Corsica, southern France, Ireland, Portugal,
Spain, Italy and Belgium (34 cities across 6 countries), but nothing in the code
knows or cares which city it is running for
([ADR-0004](adr/0004-geography.md)).

Explicitly also for **15–17 year olds**, under constrained rules. Excluding
minors from local life is not a safety strategy, it is an abdication; the design
puts them in the product with structural protections rather than out of it. See
[legal/AGE_BASELINE.md](legal/AGE_BASELINE.md) and
[threat-model/MINORS_AND_LOCAL_CONFLICT.md](threat-model/MINORS_AND_LOCAL_CONFLICT.md).

## The core loop

1. **Pick a city.** Switching is free and unconditional — exploring anywhere is
   a right. Publishing *into* a place is what requires evidence.
2. **Say one of four things.** The signal vocabulary is closed:

   | Intent | Meaning |
   |---|---|
   | **Ask** | I need something specific. |
   | **Offer** | I have something specific to give or lend. |
   | **Join** | I am doing a thing and there is room. |
   | **Event** | This is happening, at a time, in a place. |

   There is no fifth intent, and in particular **no romantic or dating intent**.
   That is not deferred — it is OUT OF SCOPE for this product surface
   ([ADR-0009](adr/0009-signal-intent-scope.md), `INV-ROMANCE-1`).

3. **Someone responds.** A response is to a specific, live signal.
4. **A thread opens — only then.** There is no way to construct a thread
   without an accepted response to a signal. Unsolicited direct messages are
   structurally impossible, not merely rate-limited
   ([ADR-0012](adr/0012-messaging-scope.md), `INV-DM-1`).
5. **Something happens in the physical world**, and — if it went well —
   evidence accumulates: an appreciation, a vouch, a recorded local outcome.

## Trust

There is no trust score, level, karma or reputation number, and adding one is
forbidden ([ADR-0003](adr/0003-trust-evidence-capabilities.md)). Trust is a set
of independent pieces of evidence:

- a verified email;
- an attested or attached tie to a place (`resident`, `work_study`,
  `second_home`, `origin_family`, `repeated_presence`);
- vouches from named people, scoped to a place;
- optionally, a provider attestation of an age threshold or identity — which in
  this build never runs live ([ADR-0006](adr/0006-kyc-boundary.md)).

Evidence derives **capabilities**, per dimension:

| Capability | Requires |
|---|---|
| `publish` | verified email |
| `publish_local` | verified email + a local tie to that place (or 2 distinct vouchers there) |
| `host` | 18+ and a local tie |
| `vouch` | 18+ and a local tie |
| `invite` | verified email |
| `respond_to_unknown_people` | verified email |
| `appear_in_people_discovery` | verified email, account not distribution-restricted |

A person can be strong in one dimension and absent in another. That is the
point: a single number invites "level 3 users may do X", which is the
social-credit shape the product rejects.

## Discover

The feed is deterministic and explains itself: the same inputs always produce
the same order, and the score breakdown ships with the card
([ADR-0008](adr/0008-ranking-and-discover.md)). A feed that cannot explain
itself is a feed nobody can argue with.

Ranking never overrides safety. Blocked content is *removed*, not demoted —
demotion is a probabilistic guarantee, and a safety rule with a probability
attached is not a safety rule (`INV-BLOCK-1`).

## Hosts are not moderators

A host decides who is in *their* gathering, and nothing else. An exclusion is
permanent for that object and invisible everywhere else: it does not follow the
person to another host's event and it does not restrict their account
([ADR-0010](adr/0010-moderation-hosts-and-blocks.md), `INV-HOST-2`). The
interface says so in words, because a host who believes they are a moderator
will behave like one.

## Measurement

Instrumentation exists to answer *"where is this starting to work"*, not *"how
long did people stare at it"*. Time-spent is deliberately not collected. The
event shape is closed — 20 named events, no free-form payload — so a coordinate,
an email address or a document field has nowhere to land (`INV-ANALYTICS-1`).

The success signal is a **local outcome recorded** — someone says the thing
actually happened — not sessions, not DAU, not time in app.

## What the local demo is

Everything above is exercised end to end in this repository against **synthetic
data and a fictional cast of 14 people**. Sign-in is a persona switcher; state
lives in the server isolate and resets. Production authentication, identity
verification, media uploads and persistence are each behind a capability flag,
and every flag defaults to off. See [README.md](../README.md) and
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).
