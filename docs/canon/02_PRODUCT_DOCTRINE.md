# QUI — Product Doctrine

**Status:** CANONICAL  
**Date:** 2026-08-19  
**Scope:** product principles and decision rules  
**Product:** QUI — `qui.social`

## 0. Purpose

This file defines the product doctrine that all agents must use when designing, coding, reviewing or prioritizing QUI.

QUI is not defined by a feature checklist. It is defined by four product commitments:

> **REAL · EQUAL · ACTIVE · LOCAL**

These are not slogans only. They must produce observable product behavior.

---

## 1. Core mission — LOCKED

QUI is a local-first social network designed to make **real people around us visible, interesting and actionable again**.

The product uses modern social discovery to move some attention away from passive spectatorship and toward:

- people who actually exist;
- things they actually do;
- skills and practices they actually have;
- activities and projects that can happen;
- relationships and collaborations that can continue offline.

A successful QUI session may end with the user **closing the app and doing something in real life**.

---

# 2. REAL

## 2.1 Meaning — LOCKED

A QUI account should correspond to a real human or an explicitly identified legitimate entity/account type.

The consumer human network must be designed to resist:

- automated bot accounts;
- hidden AI personas posing as humans;
- mass sockpuppet farms;
- troll accounts created only to attack/disrupt;
- fake local identity;
- deceptive synthetic attendance/testimonials/activity.

## 2.2 Verification doctrine — LOCKED direction

Human trust can be established through an approved trust path such as:

- third-party identity verification; or
- trusted/coopted invitation under the approved trust model.

The UX should communicate **verified human / trusted human eligibility**, not expose sensitive identity data.

KYC is infrastructure, not the product identity.

### Data principle

> **Real humans. Minimal data.**

Store attestations and required evidence, not unnecessary identity-document material.

Identity verification and local legitimacy are separate concepts.

## 2.3 Cooptation — BASELINE/HYPOTHESIS boundary

The owner wants trusted cooptation as an alternative path to direct KYC for relevant users.

Until a dedicated trust ADR locks the exact model, agents must preserve these distinctions:

- `identity_verified` and `vouched/trusted_invitation` are different evidence types;
- both may map to some shared capabilities only through explicit policy;
- do not invent legal liability for the sponsor/cooptant;
- do not create unlimited recursive invitation chains by default;
- revocation, ban-evasion, collusion and age eligibility require explicit rules.

## 2.4 AI authenticity — LOCKED

AI may assist with moderation, discovery, translation, matching, summarization or composition.

AI must not fabricate:

- fake local people;
- fake participation;
- fake testimonials;
- fake lived experience;
- fake social proof.

---

# 3. EQUAL

## 3.1 Meaning — LOCKED

Every ordinary human account has the same **structural standing** in the network.

QUI must not grant organic-distribution privilege because a user:

- is famous elsewhere;
- has a large external follower count;
- is categorized as a KOL/influencer;
- buys a boost;
- pays for a premium social rank;
- has a personal relationship with the platform operator.

## 3.2 Critical distinction — LOCKED

> **Same starting line does not mean identical final reach.**

Content may earn broader distribution because it performs well, is relevant, safe and genuinely interesting.

What is rejected is **inherited or purchased distribution privilege**.

## 3.3 Ranking implications — LOCKED

Organic ranking must not use as a positive prior:

- external follower count;
- paid subscription tier;
- creator/KOL label;
- manual VIP list.

Organic breakout may use content-level signals such as:

- completion/attention quality;
- saves/shares;
- meaningful profile discovery;
- response to a Signal/action;
- local relevance;
- negative feedback;
- safety/trust constraints;
- geographic diversity where relevant.

## 3.4 Human worth — LOCKED

QUI may rank content for relevance.

QUI must not rank human value.

No universal social-credit score, hotness score, public desirability score or public people leaderboard.

Contextual factual reputation is allowed, for example:

- hosted 8 activities;
- teaches guitar;
- completed 4 community projects;
- verified at a local association.

## 3.5 Monetization implication — LOCKED direction

Core human visibility/connection must not be degraded so it can be sold back as paid reach.

Future monetization should come from expansion layers such as:

- commerce;
- booking;
- ticketing;
- professional tools;
- recruiting tools;
- organizational capabilities;
- business/merchant services;
- other clearly separated value-added services.

---

# 4. ACTIVE

## 4.1 Meaning — LOCKED

QUI is for people who **do, make, practice, learn, teach, organize, build, help, join and create**.

The product should move users from:

> seeing → understanding → signaling intent → interacting → doing something

## 4.2 Profiles should favor practices over status — LOCKED direction

Profiles should make visible:

- what I do;
- what I can teach;
- what I can help with;
- what I want to learn;
- what I am building;
- what activity I want others to join;
- what I am interested in.

A profile should not primarily be a follower résumé.

## 4.3 Publishing implication

QUI supports expressive social posts and visual content, but publishing should make it easy to attach action/context:

- a practice;
- a project;
- a place;
- a city;
- a Signal;
- an event/activity;
- an invitation to participate.

## 4.4 Legitimate-pretext principle — LOCKED

For major features ask:

> **Does this lower the social cost of interacting with a nearby stranger?**

Examples:

- like only → weak bridge;
- shared practice → medium bridge;
- “I want to learn this too” → strong bridge;
- “Join us Saturday at 10” → very strong bridge.

QUI should build strong bridges, not only accumulate reactions.

## 4.5 Anti-spectator principle — LOCKED direction

The product may use entertaining feed mechanics, including Local Reels, but it should not optimize only for:

- time spent;
- infinite passive scroll;
- outrage;
- parasocial celebrity consumption.

Real-world and active outcomes are legitimate success metrics.

---

# 5. LOCAL

## 5.1 Meaning — LOCKED

QUI is **local-first**, not local-only.

Geography is structural to discovery and publishing. It is not a decorative filter on a global feed.

## 5.2 Worldwide from day one — LOCKED

No city is the architectural center of QUI.

- Users must be able to discover/search/add cities worldwide from the beginning.
- Ajaccio may be used for testing/demo because it is familiar to the owner, but it must not be hard-coded as the product's pilot worldview.
- Traction should emerge by city and micro-cluster based on actual use.

## 5.3 Browse vs publish — LOCKED direction

Browsing a city and claiming legitimacy to publish as a local are different permissions.

Users may explore places/cities they are not attached to.

Publishing or gaining local breakout can require a legitimate geographic attachment under explicit rules.

## 5.4 Local evidence — LOCKED constraints

QUI must not require a persistent GPS trail.

Do not expose exact live people coordinates.

The platform may use coarse/ephemeral evidence to grant a city/locality attachment and then discard raw coordinates when no longer required.

Identity verification does not prove locality.

## 5.5 Geographic breakout — LOCKED direction

Local content can earn broader reach:

> locality → city → region → country → broader discovery

Breakout must remain compatible with:

- equal structural standing;
- safety;
- user controls;
- local legitimacy;
- content relevance.

---

# 6. The QUI loop

### LOCKED product loop

```text
DISCOVER
  ↓
REAL PERSON / PRACTICE / PROJECT / ACTIVITY
  ↓
CONTEXT + LEGITIMATE PRETEXT
  ↓
SIGNAL / RESPONSE / JOIN
  ↓
SCOPED INTERACTION
  ↓
REAL-WORLD OR REAL COLLABORATIVE OUTCOME
  ↓
RICHER LOCAL GRAPH
```

Discover and Signals are distinct product concepts but must be directly connected in the UX.

---

# 7. What QUI is not

### REJECTED as product identity

QUI is not:

- Nextdoor with better design;
- a municipal directory;
- a local LinkedIn;
- an Instagram clone with location filters;
- a KYC app;
- a public people-rating system;
- a follower-economy KOL platform;
- a bot/AI-agent social network pretending to contain humans;
- a dating app as its primary identity.

Romantic use, if/when enabled under the safety model, is a possible human outcome rather than the main public identity of QUI.

---

# 8. Trust and safety implications

### LOCKED

The mission does not override safety.

QUI must structurally resist:

- doxxing;
- precise people tracking;
- unsolicited harassment;
- revenge/local-shaming posts;
- private-person accusation feeds;
- ban evasion;
- mass spam;
- fake-local campaigning;
- adult/minor romantic mixing;
- block circumvention.

Blocking is a first-class primitive.

Open unsolicited DMs are not assumed as an MVP default.

---

# 9. Open source and build in public

### LOCKED

QUI is open source and built in public.

Execution implications:

- GitHub is the public source of truth for code and non-sensitive development history;
- important product/architecture decisions belong in versioned docs/ADRs;
- issues and PRs should be understandable to outside readers;
- secrets, private data, security-sensitive operational details and vulnerability disclosures remain private;
- synthetic/demo data must never contain real private user data;
- the public implementation should make important trust claims inspectable where practical.

Do not confuse build-in-public with publishing active vulnerabilities, credentials, KYC data, moderation intelligence or abuse-detection thresholds that materially facilitate attacks.

---

# 10. Product decision test

When an agent proposes a new feature, score it against these questions:

1. **REAL** — does it increase confidence that interactions are with real people without collecting unnecessary sensitive data?
2. **EQUAL** — does it preserve structural equality or create a hidden status/paid-distribution caste?
3. **ACTIVE** — does it help users do something, or only consume more content?
4. **LOCAL** — does it strengthen meaningful geographic relevance without surveillance?
5. **SAFETY** — can it be abused to harass, track, shame or impersonate people?
6. **FREE CORE** — does it preserve ordinary human discovery/connection as a free core capability?

A feature that strongly violates one doctrine pillar requires an explicit owner decision/ADR, not a silent tradeoff.

---

# 11. Canonical product statements

Use these as internal positioning anchors; public copy can be refined.

- **Make the people around us visible again.**
- **Real humans. Minimal data.**
- **Same starting line. Reach is earned, not bought or inherited.**
- **Share what you do. Find people who want to do something too.**
- **Local-first social.**
- **The feed earns attention. The graph turns some of that attention into real life.**
