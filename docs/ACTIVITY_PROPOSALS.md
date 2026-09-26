# Activity proposals — requirements, corrected design and open policy amendments

This page keeps three things apart, because they carry different authority:

1. **Owner product requirements.** Stated by the product owner. They are the
   target, but they do not by themselves change any `LOCKED` rule or `INV-*`
   invariant.
2. **Proposed technical and policy decisions.** **Status: HYPOTHESIS.** Written
   by an agent to meet those requirements. None is owner-approved and none is
   an ADR.
3. **What exists in code today.**

"Anyone may propose" is a product requirement. It is **not** authorization to
weaken an age, block, locality or messaging rule. Where a requirement meets a
locked rule, the rule stands until an owner decision and, where required, a
superseding ADR say otherwise.

---

## 1. Owner product requirements

**Search becomes a proposal.**
- A person searches by activity, area, availability and optional criteria.
- QUI shows compatible existing activities. From the same inputs, it prepares
  a publishable proposal, without asking for a second form.
- This works even when nothing matches.
- Each published proposal represents a real person's intention.

**Explicit publication, with inputs preserved.** The required flow is:

```text
search ──► compatible results ──► prefilled proposal ──► one explicit "Publish"
              │                                                ▲
              └── sign-in / account creation if needed ────────┘
                  (every input survives: activity, area, availability,
                   criteria, equipment, costs)
```

- Searching never publishes and never joins. The same holds for a future
  agent connector.
- Authentication in the middle of the flow must not lose or silently change
  any input.

**One activity through its whole life.**
- There is no separate "request" to convert later.
- A proposal may exist before a date, a full group, equipment or an organizer
  is agreed.
- Existing Signal intents and the wider social product are kept.

**Flexible criteria and availability.**
- Precise dates and broader availability are both supported, with several
  possible windows.
- Mandatory constraints are kept distinct from preferences.
- Overlapping availability is not a confirmed appointment.

**Anyone can originate a proposal.** Proposing an intention, participating,
and accepting responsibility as host are distinct actions. Each keeps its own
age and locality rules.

**Equipment, only when necessary.**
- For equipment-dependent activities, show:
  - required items and quantities;
  - what has been contributed;
  - what is still missing.
- Participants add and update their own contributions.
- Personal-use items are kept distinct from items available to others, and a
  suggested rental from confirmed availability.
- Availability is tied to dates, and coverage is recalculated when dates,
  participants or contributions change.
- Activities stay discoverable while equipment is missing.
- A walk never gets an equipment form.
- A declared item is never presented as a safety certification.

**Free core.**
- Searching, proposing, joining, coordinating, and declaring equipment or
  shared costs stay free.
- Later optional payments, reservations, commissions and professional tools
  must preserve equal organic standing.
- The first implementation has no payment integration and holds no money.

**Future agent entry point (Muse).**
- It follows the same flow (search → results → confirmed proposal) and reuses
  QUI's services and permissions.
- Nothing assumes listing approval, guaranteed recommendations or a
  notification integration.

---

## 2. Proposed technical design (HYPOTHESIS)

1. **Availability keeps each person's real intervals and their time zone.**
   Nothing is reduced to a yes/no against someone else's window.
   - A *proposed* activity needs an overlap at least as long as its duration.
   - A *scheduled* activity needs one declared interval that contains the
     whole appointment.
   - Moving a date re-checks every declaration. Nobody is confirmed for a time
     they did not name.

2. **Equipment has two separate dimensions.**
   - *Use*: `own_use` (serves only its owner, up to their own need) or
     `shareable`.
   - *Status*:
     - `suggested` — an unresolved option, such as a rental hut;
     - `offered` — for example "I can book a court"; pending;
     - `confirmed` — the person confirms it for stated times.
   - **Only `confirmed` counts**, and only for an interval it fully covers.
   - A required court reservation is met only by a confirmed booking for that
     interval.
   - Each contribution counts once, and only from someone in the activity.
   - Missing equipment is reported and never hides an activity.
   - An activity with no needs has no equipment state.
   - There is no `verified` or `safe` field.

   **Dates on a contribution (future UI):** when someone adds or confirms an
   item, its availability is **prefilled from that person's declared
   availability intervals**. They confirm or adjust it before saving. Stored
   intervals are exactly what they confirmed.

   When the activity's date moves, a contribution is never extended to the new
   date. It counts again only if its confirmed intervals already contain the
   new time. Otherwise the item shows as "not confirmed for the new time" and
   its owner is asked to re-confirm.

   A `confirmed` contribution with no dates counts for nothing. The UI must
   therefore require dates at confirmation.

   **Overlap vs candidate interval (implemented).** For a *proposed* activity,
   the possible overlap between someone's times and the activity (`overlap`)
   can be longer than the activity itself. Equipment is judged against an
   activity-length **candidate interval** inside that overlap: the one the
   confirmed declarations cover best, which need not be the earliest.

   Example: a 120-minute activity, an overlap of 14:00–18:00 and a board
   confirmed for 15:00–17:00 give the candidate 15:00–17:00, which is covered.

   The candidate is **not an appointment**; the wording stays "if it runs …".
   No availability is invented: an interval that no single declaration
   contains is not covered. For a *scheduled* activity, the candidate is the
   whole appointment and equipment must cover all of it.

3. **Discovery and joining are separate.**
   - Matching takes no viewer and grants nothing.
   - Visibility projection is applied before activities are passed in.
   - Joining stays with `canJoinEvent`.
   - Match input and output carry no free text and no participant ids.
   - Anonymous discovery must not require a join capability.

4. **Existing Join and Event signals are matched, not dropped.**
   `describeSignal` gives them:
   - `start_only` timing;
   - unknown cost and unknown level;
   - no equipment state;
   - unknown organizer participation.

   Anything unknown yields `unconfirmed`, never a claimed match.

5. **Budget.**
   - A numeric per-person ceiling with a currency sits alongside the free /
     shared-cost preference.
   - These never satisfy a mandatory ceiling: an unknown cost, an unsettled
     split, or a cost in another currency.
   - Known and estimated costs are labelled differently.
   - Shares are rounded up.

6. **Participation is explicit.**
   - The organizer counts once if taking part, and not at all otherwise: no
     place and no personal equipment need, though they may lend.
   - Historical `capacity` keeps its meaning, places for people other than the
     host (`excludes_organizer`).

7. **Draft preservation (future UI).**
   - The draft lives client-side (URL parameters plus session storage) across
     sign-in.
   - The server keeps no anonymous draft.
   - Publishing is one explicit, authenticated request built from the
     preserved draft.

---

## 3. Proposed policy amendments (HYPOTHESIS — owner decisions required)

**Owner decision, 2026-09-26:** **P1 and P5 are approved** for the adult-only
synthetic demo and recorded in
[ADR-0016](adr/0016-activity-proposals-without-host.md). Designating a host (the
rest of P1) is not implemented yet. **P2–P4 and P6–P7 remain unapproved.**

| # | Rule | Proposed exact change | Kind |
|---|---|---|---|
| P1 — **approved** (ADR-0016) | `INV-HOST-2` / ADR-0010: host power "is granted only to that object's creator" | "…granted only to that object's **designated host**: one adult with a local tie to that place, confirmed by the proposer. A proposal with no designated host has no host powers." | LOCKED text |
| P2 | `INV-DM-1` / ADR-0012: a thread exists only after an accepted response to a live signal | Add a second thread kind: "An activity group thread exists only as a consequence of joining a live Join activity; its members are that activity's members; nothing opens it from a profile, handle or user id." | LOCKED text |
| P3 | `INV-AGE-2`: cross-band contact only "in hosted group contexts, where a host is present" | Define it as: "a designated adult host is a member **and** the group has at least three members. Otherwise the space is read-only for cross-band writing." | LOCKED text (tightening) |
| P4 | `INV-BLOCK-1`: "an existing thread freezes" | See below. | LOCKED text |
| P5 — **approved** (ADR-0016, adults only) | `createSignal` requires `host` (18+, local tie) for any Join | See below. | Policy amendment |
| P6 | Proposals originated by minors | Visible and joinable only within the 15–17 band, with no adult host. For real users, gated on an age-threshold attestation. | Privacy / permissions |
| P7 | Participant list visibility | Identities visible to members and host only; everyone else sees counts and coverage. This changes current Join/Event pages. | Privacy |

### P4 — blocks inside a group activity (proposed)

Keep "the thread freezes" for two-person threads. For group activities:

1. **Before joining.** A join is refused when a block exists, in either
   direction, between the joiner and any current member. The reason is
   generic: `unavailable`, not `blocked`.
2. **After both have joined.**
   - Each person is removed from the other's view: messages, participant list
     and contributions.
   - The thread is not frozen for everyone else.
   - The **blocker** receives a **private notice**: "someone you have blocked
     is part of this activity". The blocked person receives nothing.
   - The notice comes with a **one-step withdrawal option**: leaving the
     activity, with the person's own contributions withdrawn. Taking it never
     reveals the reason to anyone.
3. **What this does not do.**
   - Filtering removes someone from a screen, not from a place. Two people who
     blocked each other may still both turn up at the same real-world
     activity. QUI cannot prevent physical co-attendance and must not claim to
     separate them.
   - A generic refusal reduces disclosure, but it cannot make group membership
     impossible to infer. A person refused from one activity and accepted into
     others can narrow down who is present, especially in a small group or a
     small town.
   - The rule lowers the signal; it does not remove it. Nothing here is
     presented as a guarantee of separation.

### P5 — who may propose (approved for adults, ADR-0016)

1. **Proposing** a hostless Join requires:
   - an active account with `publish` (verified email);
   - **any** attachment to that city, including `exploring` or `visitor`.

   This is how a visitor can propose paddleboarding in a city they are only
   exploring. Today, `ask` and `offer` already accept any attachment; the
   `publish` requirement is a tightening.
2. **Hosting** keeps its existing, separate requirements, unchanged: the
   `host` capability (18+ and a local tie to that city, ADR-0002 and
   ADR-0003). An exploring attachment never qualifies someone to host.
3. **Participating** keeps today's rules (`respond_to_unknown_people`,
   `canJoinEvent`).
4. A hostless proposal has no host powers and no response-approval path until a
   host is designated (P1).

As approved, proposing also requires the **adult** band, because P6 is not
approved. `createSignal` itself is unchanged: creating a hosted Join or Event
still requires `host`. Proposals go through `publishProposal`.

---

## 4. What exists in code

| Piece | File | State |
|---|---|---|
| Time intervals with zone context, per-person availability declarations | `activity/interval.ts` | pure, tested |
| Participation (organizer vs participants), capacity semantics, availability for an appointment or a window | `activity/participation.ts` | pure, tested |
| Declared cost: free / known / estimated / unknown, per-person ceiling | `activity/cost.ts` | pure, tested |
| Equipment needs, contributions, interval-specific coverage | `activity/equipment.ts` | pure, tested |
| Compatibility with reasons, deterministic ordering | `activity/match.ts` | pure, tested |
| Honest description of existing Join/Event signals | `activity/describe.ts` | pure, tested |
| Day/part-of-day slots to instants in the city's zone (DST-safe) | `activity/search-input.ts` | pure, tested |
| Proposal preview built from the search inputs | `activity/preview.ts` | pure, tested |
| Read-only activity search | `services/search.ts`, `POST /api/activities/search` | wired, tested |
| Search → results → preview screen | `app/search`, `components/ActivitySearch.tsx` | wired, e2e |
| Publishing the preview as a hostless proposal (ADR-0016) | `services/proposals.ts`, `POST /api/activities/proposals` | wired, e2e |

**Search, results and preview (synthetic demo).**

- The search writes nothing about any person: no publish, join, response or
  analytics event. Its only write is caching a public place row the first
  time a worldwide city is looked up, as city switching already does.
- Its candidates are exactly what the Signals list already shows the viewer.
  Both go through one policy, `canViewSignal`, which removes the following
  *before* projection and matching, so they are neither shown nor counted:
  - removed content;
  - blocked pairs;
  - suspended or distribution-restricted authors (INV-SUSPEND-1; the author
    still sees their own);
  - adult-only audiences, for minors.

  Only open Join/Event signals are matched.

  Direct access is a separate, lower floor. The signal page (by link) and a
  person's profile use `canReadSignal`: removed, blocked, a suspended author
  and adult-only-for-minors are hidden there too. A restricted author's signal
  stays readable by direct link, because restriction removes amplification,
  not the content.
- Every seeded signal has a start but no end time, so its honest best result is
  "Needs confirmation".
- The form works without a session. The draft lives only in this tab's
  `sessionStorage`; it never goes into a URL, and the search request is a POST.
- The search itself requires the demo identity. Onboarding returns to `/search`
  through an allow-listed return path, with the inputs intact.
- The preview is built from the same inputs, including when nothing matches,
  and states only what was supplied:
  - "free, preferably" is not a confirmed free cost;
  - equipment is "not specified", never "none needed";
  - an empty result reads "no matching activity found for these criteria".

  A signed-in adult with any tie to the city can publish it with one explicit
  action; see **Publishing a proposal** below.
- **Anonymous results are not offered.** An identity-free anonymous projection
  remains an open decision.

**Publishing a proposal (ADR-0016, P1 and P5 approved for the adult-only demo).**

- **One explicit Publish on the preview.** It publishes exactly the inputs the
  visible preview was built from, as one `join` Signal with `hostId: null`.
  There is no separate request object.
- **Structured `plan`.** It holds:
  - the practice, the time zone and the duration;
  - each candidate window with its preferred flag;
  - the level and free-only criteria, each still required or preferred.

  Because `startsAt` stays null, no window becomes an appointment. Cost and
  equipment are not recorded, so they stay unknown.
- **Eligibility is checked server-side before any write** (`canProposeActivity`).
  The proposer needs an active adult account, `publish`, and an existing
  attachment of any kind to the city. The service never creates one, and a
  refusal writes nothing.
- **Idempotent.** The signal id is derived from the proposer and a key the
  browser keeps with the draft for those exact inputs. Retries, reloads and
  double clicks reach the same activity; the same key with different inputs is
  a conflict.
- **Discovery.** The proposal is listed and matched through `canViewSignal` and
  the existing matcher. Its windows are matched as proposed windows, and only a
  *required* level counts as a stated level.
- **INV-PROPOSAL-1.** Nobody can join or answer the proposal (`awaiting_host`),
  it opens no thread, and its proposer holds no host power and no
  participation.
- **Storage.** The in-memory demo store keeps proposals. The D1 adapter
  refuses them and reads every stored row as hosted by its creator.

The pure modules change no permission; the publication rules above are the
approved amendments.

Runtime participation fixes. These restrict; they do not widen:

- `decideResponse` validates before its first write, and **every** acceptance
  is revalidated against current eligibility: a repeat acceptance, and a
  responder who already joined directly, included. Existing membership only
  stops a place being counted twice; it never bypasses suspension, blocks,
  exclusion, audience or signal lifecycle. `joinSignal` applies the same rule
  to a member retrying a join.
  Accepting an Ask or Offer is revalidated the same way (`canRespondToSignal`,
  then `canOpenScopedThread` for the age-band rule), repeats included.
  - Accepting into a Join or Event runs the same `canJoinEvent` check as a
    direct join: live signal, block, host exclusion, audience, capacity.
  - Accepting an Ask or Offer runs `canOpenScopedThread` before the response
    is marked accepted.
- Repeating a decision has no second effect. Accepting a withdrawn response,
  or declining an accepted one, is a `conflict`. Joining twice creates no
  duplicate row.
- Outcome reports are restricted by `canReportOutcome`, recorded as
  **`INV-OUTCOME-1`** in [SAFETY.md](SAFETY.md).
  - For a Join or Event, only current membership counts: an old accepted
    response does not survive removal or exclusion.
  - For an Ask or Offer, an accepted responder still qualifies unless the host
    excluded them.
  - Reports remain self-reports. No attendance verification exists.

---

## 5. Correction for future connector work

A stateless signed draft token proves integrity and expiry, **not single
use**. Without server-side state it can be replayed until it expires. Single
use needs one of:

- a nonce or token id stored when first consumed, checked atomically before
  publishing or joining, and kept until the token's expiry;
- an idempotency key derived from the user and the draft hash, enforced by a
  unique constraint.

A token also never replaces the human confirmation inside QUI.

## 6. Not done here, deliberately

- No UI, route or connector.
- No group messaging, host delegation or `minors_only` audience.
- No change to who may create a Join or Event.
- No new analytics events, no attendance confirmation, no reporting subsystem.
- No schema migration, and no persistence of plans, availability or
  contributions.
- No payments, custody or partner surfaces.
