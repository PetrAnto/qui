# QUI — Application UX System

**Status:** CANONICAL execution baseline  
**Date:** 2026-08-19  
**Scope:** mobile-first application information architecture and core UX patterns  
**Product:** QUI — `qui.social`

## 0. UX north star

The application must make this path feel natural:

> **Discover a real person → understand what they do → find a legitimate reason to interact → do something together.**

The app should feel like a modern consumer social product, not a directory, civic portal, job board or KYC flow.

Default visual implementation follows `01_BRAND_SYSTEM.md`: light, warm, human, mobile-first.

---

# 1. Global information architecture

## 1.1 Mobile bottom navigation — BASELINE

Use five primary destinations:

1. **Discover**
2. **Signals**
3. **Create**
4. **Activity**
5. **Me**

### Rationale

- `Discover` answers: **Who/what is interesting around me?**
- `Signals` answers: **What can I actually do with people?**
- `Create` keeps publishing one tap away.
- `Activity` consolidates responses, scoped threads, notifications and later messaging entry points.
- `Me` owns profile, trust, cities, settings and account state.

Do not create a separate permanent `Cities` tab; city is a **global context selector**, not a destination silo.

## 1.2 Desktop navigation — BASELINE

Left rail or top/left hybrid with the same conceptual destinations.

Do not introduce desktop-only conceptual navigation that changes the product model.

---

# 2. Global city context

## 2.1 City selector — LOCKED direction

A persistent city/locality context appears near the top of primary discovery surfaces.

Example:

> `Ajaccio ▾`

or

> `Around Ajaccio ▾`

Opening the selector provides:

- search any city;
- recent cities;
- legitimate attached cities;
- optional nearby/travel-relevant suggestions;
- clear distinction between `Exploring` and `Local publishing access`.

## 2.2 Worldwide behavior — LOCKED

Users can search/explore cities globally from day one.

No hard-coded first-city product logic.

## 2.3 Browse vs publish

A user may browse a city without claiming to be local.

Publishing into a city or receiving local breakout eligibility can require a valid geographic attachment according to trust rules.

Consumer copy should be understandable:

- `Exploring Lyon`
- `Verified local access`
- `Visitor access`

Avoid exposing raw trust-policy jargon.

---

# 3. Discover

## 3.1 Purpose

Discover is the attention engine of QUI.

It should answer:

> **What and who is interesting around me right now?**

but each discovery item should preserve a path toward action.

## 3.2 Discover surface — BASELINE

Use a mixed but intentionally structured feed with explicit modes/filters rather than a single undifferentiated stream.

Recommended top modes:

- **For you** — personalized local discovery;
- **Nearby** — stronger geographic relevance;
- **Reels** — visual/short-form mode;
- **People** — people/practice discovery;
- optional later: `Projects`, `Places`.

Do not let tabs proliferate before data justifies them.

## 3.3 Feed card requirements

Each content card should expose enough context to answer:

- who is this?
- where is this relevant?
- what do they do?
- why am I seeing it?
- what can I do next?

### Minimum card anatomy

- profile image + name;
- compact trust cue;
- city/local context;
- media/content;
- practice/project tags when relevant;
- primary action;
- lightweight social reactions;
- overflow safety actions.

### Primary action examples

- `View practice`
- `Join`
- `Ask about this`
- `I want to learn`
- `Offer help`
- `See project`

A plain `Like` may exist but should not be the only meaningful affordance.

## 3.4 Reels

Reels are an important discovery format, not a separate product universe.

Reel UI should include:

- person/profile context;
- location/city scope;
- practice/project context;
- response/Signal affordance;
- share/save;
- block/report.

### Ranking doctrine

Do not boost because of:

- follower count;
- KOL status;
- paid tier.

Broader breakout can be earned through content response/relevance under safety constraints.

## 3.5 Why am I seeing this?

Provide a compact explanation surface when feasible:

- `Popular around Ajaccio`
- `Because you follow analogue photography`
- `From a city you explore`
- `Breaking out in Corsica`

Ranking need not expose the full algorithm but must remain conceptually auditable.

---

# 4. Profiles

## 4.1 Profile purpose — LOCKED

A profile is a **local human identity and activity surface**, not a follower résumé.

The first screen should answer:

- who is this person?
- are they a trusted/verified human?
- where do they legitimately belong?
- what do they do?
- what can I meaningfully interact with?

## 4.2 Profile header — BASELINE

Include:

- real profile image;
- display name;
- compact verified/trust badge;
- city/attachment context;
- concise bio;
- primary relationship action such as `Connect`, `Respond`, or context-aware Signal action;
- overflow block/report.

Do not make follower/following counts the dominant element. If counts exist, visually de-emphasize them.

## 4.3 Profile modules

Recommended order:

1. **Doing now** — current activity/project/practice;
2. **Practices** — what this person actually does;
3. **Can teach / can help with**;
4. **Wants to learn / wants to do**;
5. **Posts & Reels**;
6. **Projects / activities**;
7. **Selected social identities**;
8. **Factual contribution history**, if useful and safe.

## 4.4 Relationship/romantic data

Do not infer or expose private romantic openness from public relationship status.

Any romantic layer must follow its separate adult/safety rules and is not assumed as a default profile CTA.

---

# 5. Signals

## 5.1 Purpose — LOCKED

Signals provide the **legitimate pretext** that turns discovery into action.

Signals are structured intent objects, not merely posts with labels.

## 5.2 Core types — BASELINE

MVP-capable set:

- **Ask** — I need help/advice/a person/tool;
- **Offer** — I can help/show/lend/guide;
- **Learn** — I want to learn this;
- **Teach** — I can teach this;
- **Join** — join this activity/project;
- **Event** — come to this place/time;
- **Project** — I am building/making/restoring this with others.

If simplification is required, preserve semantic extensibility rather than hard-coding UI around only one type.

## 5.3 Signal card anatomy

- type + concise title;
- author and trust cue;
- city/place context;
- time/expiry;
- description;
- practice/tags;
- participation constraints where relevant;
- primary response CTA;
- count/status that does not become a popularity contest;
- block/report.

## 5.4 Signal lifecycle

Baseline states:

```text
Draft → Active → Paused/Filled → Expired/Closed
```

Signals should expire or close naturally so the network does not become a stale bulletin board.

## 5.5 Response model

Prefer structured first contact:

- `I'm interested`
- `I can help`
- `I want to join`
- short optional note.

Then open a scoped thread only when appropriate.

Do not require unrestricted DMs for the feature to work.

---

# 6. Publishing / Create

## 6.1 Create entry point

The center `Create` action opens a bottom sheet/full-screen composer with explicit options:

- **Post**
- **Reel**
- **Signal**
- optional later: `Event` if not represented as a Signal subtype.

## 6.2 Post composer

Required concepts:

- text/media;
- city/locality context;
- optional practice/project association;
- audience/distribution context;
- optional action bridge (`Turn into Signal`, `Invite people`, etc.);
- safety/reporting policy reminders only when relevant.

## 6.3 Reel composer

Required:

- direct upload;
- caption;
- city/locality;
- practice/project linkage;
- optional Signal/action link;
- visibility/breakout preference where product policy allows;
- media processing state.

Strip sensitive EXIF/geolocation metadata by default in media pipeline.

## 6.4 Signal composer

Flow:

1. choose type;
2. one-sentence intent;
3. select practice/topic;
4. choose city/place scope;
5. date/time/expiry if relevant;
6. capacity/constraints if relevant;
7. preview;
8. publish.

The composer should feel faster than creating an event on a traditional social platform.

---

# 7. Verification and onboarding

## 7.1 Onboarding philosophy

Do not front-load a bank-style KYC wall before the user understands QUI unless legal/safety policy requires it.

Preferred journey:

1. create account;
2. choose/confirm initial city context;
3. build minimal profile;
4. see product value/demo where safe;
5. request verification before trust-sensitive publishing/interaction capabilities.

## 7.2 Consumer trust choices — BASELINE

Verification UI can present approved paths such as:

- `Verify with ID`
- `Use a trusted invitation`

Exact capability equivalence is governed by trust policy, not UI assumptions.

## 7.3 Verification status display

Profile/public UI exposes only minimal trust states, for example:

- `Verified human`
- `Trusted invitation`

Do not expose:

- document provider internals;
- document numbers;
- full DOB;
- identity-document images;
- sponsor/cooptant private information unless explicitly required by policy.

## 7.4 Local verification

Local attachment is a separate flow from human verification.

Possible user-facing state:

- `Exploring this city`
- `Local access verified`
- `Visitor`

Do not show raw GPS evidence/history.

---

# 8. Activity and interaction

## 8.1 Activity tab — BASELINE

Combines:

- Signal responses;
- scoped threads;
- mentions/replies;
- invitations;
- relevant notifications;
- later, approved messaging connections.

This avoids introducing a full open-DM product before interaction rules are ready.

## 8.2 Thread safety

Every thread surface must support:

- block;
- report;
- leave/end interaction;
- clear context showing which Signal/project initiated the thread.

Blocked-user semantics override discovery/contact convenience.

---

# 9. Me / account

## 9.1 Me surface

Contains:

- editable profile;
- practices/skills;
- projects;
- posts/Reels/Signals;
- connected identities/social bridges;
- verification state;
- city/local attachments;
- privacy controls;
- blocked accounts;
- safety/report history where appropriate;
- account/security;
- open-source/about links.

## 9.2 Settings taxonomy

Keep consumer terminology simple:

- Account
- Privacy
- Verification
- Cities & local access
- Connected accounts
- Notifications
- Safety & blocked accounts
- Appearance
- About QUI

Do not expose internal architecture terms such as `trust tier`, `geo evidence`, `KYC provider ref` unless in an advanced diagnostic/admin view.

---

# 10. Key reusable components

Agents should prefer a small coherent component system.

## Navigation

- `MobileBottomNav`
- `DesktopNavRail`
- `CitySwitcher`
- `ContextHeader`

## Identity

- `Avatar`
- `HumanTrustBadge`
- `LocalAttachmentBadge`
- `ProfileHeader`
- `PracticeChip`
- `SocialIdentityChip`

## Discovery

- `PostCard`
- `ReelCard`
- `PersonCard`
- `ProjectCard`
- `WhyThisItem`
- `BreakoutLabel`

## Intent

- `SignalCard`
- `SignalTypeBadge`
- `SignalComposer`
- `SignalResponseSheet`
- `ScopedThread`

## Publishing

- `CreateSheet`
- `PostComposer`
- `ReelComposer`
- `AudienceContextPicker`
- `CityScopePicker`

## Trust & safety

- `VerificationCard`
- `VerificationPathPicker`
- `BlockAction`
- `ReportSheet`
- `SafetyNotice`

## Feedback/state

- skeletons;
- empty states;
- offline/retry states;
- upload progress;
- verification pending;
- city-access pending;
- moderation pending where required.

---

# 11. Empty states

QUI must be useful before high city density.

Empty-state design should propose actions such as:

- explore another city;
- create the first Signal around a practice;
- invite a trusted person;
- follow a practice;
- create a project/activity;
- discover public places/entities where seeded.

Do not fake user activity to make a city look populated.

---

# 12. Equal-standing UX rules

### LOCKED

Do not build UI that implies organic hierarchy through:

- premium checkmarks;
- VIP avatar rings;
- KOL labels;
- follower-count leaderboards;
- paid post boosts mixed into organic ranking;
- “top people” rankings based on popularity.

### Allowed

- content can be labeled `Trending in…`;
- factual contribution context can be shown;
- commercial content may exist later if clearly separated/labeled and does not masquerade as organic rank.

---

# 13. Safety-by-design UX rules

The product must never default to:

- live maps of people;
- exact people coordinates;
- open unsolicited DMs;
- public accusation categories;
- anonymous local denunciation;
- public romantic intent badges;
- adult/minor romantic discovery mixing;
- blockable users still appearing through attendance/follower loopholes.

Report/block must be reachable from all relevant people/content/thread surfaces.

---

# 14. UX metrics

Do not optimize only for session time.

Useful product metrics include:

### Discovery quality

- meaningful profile opens;
- saves/shares;
- Reel completion where applicable;
- practice/project discovery.

### Action quality

- Signals created;
- Signals answered;
- join/help/learn/teach responses;
- scoped conversations started;
- projects/activities formed.

### Real-world outcomes

- activity attendance/confirmation where appropriate;
- self-reported successful meet/help/learn/build outcome;
- repeat participation.

### Safety

- blocks/reports;
- repeat harassment;
- ban evasion;
- moderation latency;
- false positives/appeals.

---

# 15. Mobile quality bar

For every core flow, agents must verify at minimum:

- one-handed usability;
- 44px+ practical touch targets;
- no tiny metadata required to understand trust/locality;
- media does not shift layout unexpectedly;
- primary CTA is reachable without hover;
- bottom nav is not hidden by browser safe-area issues;
- composers handle mobile keyboard correctly;
- loading skeletons preserve layout;
- accessible focus/labels exist;
- reduced-motion behavior works;
- poor network states degrade gracefully.

---

# 16. MVP UX boundary

The application UX system must allow future expansion without requiring all features on day one.

### Strong MVP core

- account/onboarding;
- human trust path abstraction;
- city exploration/context;
- local attachment state abstraction;
- profile with practices/skills;
- Discover feed;
- posts/media baseline;
- Signals;
- structured Signal response/scoped interaction;
- block/report;
- mobile navigation;
- deterministic/synthetic demo data.

### Can be deferred behind interfaces

- full romantic Mutual Signals;
- unrestricted messaging;
- advanced social bridges;
- ZK vault;
- complex AI recommendations;
- advanced creator analytics;
- paid business tooling;
- full commerce/booking/ticketing;
- sophisticated live presence;
- deep gamification.

Local Reels can be included early as a product direction/vertical slice, but must not force the whole MVP to become a video infrastructure project before the core Discover → Signal loop is validated.

---

# 17. Agent UX review checklist

Before merging a core UX PR, verify:

- [ ] Does the screen make real-human trust understandable without exposing private identity data?
- [ ] Does it preserve equal structural standing?
- [ ] Does it create a route from discovery to action?
- [ ] Is city/local context visible but not creepy/precise?
- [ ] Are block/report paths present where needed?
- [ ] Is the product UI using the light canonical design system?
- [ ] Is the flow useful on mobile first?
- [ ] Are empty states honest rather than populated with fake humans?
- [ ] Does the implementation avoid turning QUI into a directory/job board/dating clone?
- [ ] Are deferred features represented by clean boundaries rather than half-built unsafe behavior?
