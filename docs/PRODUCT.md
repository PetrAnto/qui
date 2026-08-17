# Product

**Status of this document: BASELINE** for the current MVP surface.
Long-term product principles marked LOCKED below are owner decisions
([ADR-0014](adr/0014-public-brand-qui.md)).

QUI is **not** a utility app with a small feed attached.

> A distinct local social world for the real people, things and opportunities
> close enough to matter in real life.

> Make the people around us visible again.

> The feed earns attention. The graph should turn some of that attention into
> real life.

The global internet remains valuable. QUI separates a **local** social world
from the infinite global comparison set.

## Public identity

- Product name: **QUI**
- Intended primary domain: **qui.social** (not claimed as connected until
  independently verified)
- `indenoi` is an obsolete internal codename, not a public brand

## Who it is for

People with a real, continuing tie to a specific place — residents, people who
work or study there, people who grew up there and come back, people who split
their year. Users may **explore or follow arbitrary cities from day one**.
Exploring is not local legitimacy. Publishing *as a local* requires geographic
evidence ([ADR-0004](adr/0004-geography.md)).

A person may hold several legitimate city attachments.

The public narrative may speak of people and opportunities “within roughly
20 minutes of real life”. That is a **HYPOTHESIS** about reachability, not a
hard radius and not a GPS trail.

Explicitly also for **15–17 year olds**, under constrained **current MVP
safety rules**. The 15+ floor is a **BASELINE**, not a cleared legal
conclusion and not a LOCKED global policy
([legal/AGE_BASELINE.md](legal/AGE_BASELINE.md)).

## What people should be able to discover

Interesting people, creators, practices, skills, posts, photos, **Local Reels /
short-form visual content** (long-term), places, activities, events,
opportunities, jobs, and Signals.

The product must remain visually attractive, socially magnetic, useful, human,
local, and commercially ambitious.

QUI is not merely a bulletin board, a Signal exchange, a directory, a civic
utility, or an event app.

## The core loop

```
visual / person discovery
        ↓
profile / practice curiosity
        ↓
contextual or standalone Signal
        ↓
scoped interaction
        ↓
possible real-world outcome
```

Discover and Signals are distinct concepts and must not feel like disconnected
products.

1. **Pick a city.** Switching is free and unconditional.
2. **See what is happening.** The current MVP Discover surface is a local
   visual feed with deterministic, auditable ranking
   ([ADR-0008](adr/0008-ranking-and-discover.md)). It is **not** a global
   infinite recommendation feed. Local posts, photos and future Local Reels
   remain first-order product direction.
3. **Say something, or answer something.** The first implemented Signal
   vocabulary is:

   | Intent | Meaning |
   |---|---|
   | **Ask** | I need something specific. |
   | **Offer** | I have something specific to give or lend. |
   | **Join** | I am doing a thing and there is room. |
   | **Event** | This is happening, at a time, in a place. |

   These are **not** the only intents QUI may ever support. Learn, Teach,
   Project, Activity, jobs/opportunities and adult-only private Mutual Signals
   are **DEFERRED / HYPOTHESIS**. Romance is **DEFERRED and disabled** in the
   current MVP — not permanently forbidden
   ([ADR-0013](adr/0013-romance-deferred-not-forbidden.md)).
4. **Someone responds.** A response is to a specific, live signal.
5. **A thread opens — only then (current MVP).** Unsolicited open DMs are
   structurally impossible today (`INV-DM-1`,
   [ADR-0012](adr/0012-messaging-scope.md)). Broader messaging once safely
   eligible is a long-term possibility, not this release.
6. **Something happens in the physical world**, and evidence may accumulate:
   an appreciation, a vouch, a recorded local outcome.

## Trust

There is no trust score, level, karma or reputation number
([ADR-0003](adr/0003-trust-evidence-capabilities.md)). Trust is independent
evidence:

- a verified email;
- an attested or attached tie to a place;
- vouches / cooptation by an accountable verified person
  (**HYPOTHESIS** — vouch ≠ identity, ≠ residence, ≠ moderator);
- optionally, a provider attestation of an age threshold or identity — which
  in this build never runs live ([ADR-0006](adr/0006-kyc-boundary.md)).

Evidence derives **capabilities** at read time. A person can be strong in one
dimension and absent in another.

A future normal path may be a lightweight verified-human flow; an alternative
may be cooptation. Both need legal and abuse validation before they unlock
sensitive capabilities.

## Discover

The current feed is deterministic and explains itself. Ranking never overrides
safety: blocked content is *removed*, not demoted.

QUI **should** have an excellent local visual discovery feed. QUI **must not**
clone the global infinite recommendation machine, optimise only for time spent,
or invent a human “hotness” score.

Local Reels, richer posts and geographic breakout remain legitimate long-term
directions. They are not implemented in this MVP.

## Free human core (LOCKED)

Ordinary consumer human connection stays genuinely free. Do not design
paywalls around joining, local discovery, posting, Local Reels, normal
Signals, basic local opportunities/jobs, ordinary connection, future mutual
adult romantic discovery, or basic messaging once safely eligible.

Future monetization may come from additional value (merchant storefronts,
payments, booking, commerce, professional recruiting, organization tooling,
ticketing, professional analytics, premium expansion, aligned B2B). Do not
hard-code a business-model ceiling. Advertising/sponsorship is **OPEN / not
part of MVP** — never covert, never mixed into organic ranking, never at the
cost of the free human core.

## Hosts are not moderators

A host decides who is in *their* gathering, and nothing else
([ADR-0010](adr/0010-moderation-hosts-and-blocks.md)).

## Measurement

Instrumentation exists to answer *where is this starting to work*, not *how
long did people stare at it*. Time-spent is not collected
(`INV-ANALYTICS-1`). The success signal is a **local outcome recorded**.

## What the current demo is

Everything above that is implemented is exercised end to end against
**synthetic data and a fictional cast of 14 people**. Sign-in is a persona
switcher; state lives in the server isolate and resets. Production
authentication, identity verification, media uploads and persistence are each
behind a capability flag, default off.

Editorial landing photographs are licensed illustrations of real practices.
They are **not** QUI members, not locals, and not endorsements
([assets/LANDING_HERO_PHOTOGRAPHY.md](assets/LANDING_HERO_PHOTOGRAPHY.md)).
