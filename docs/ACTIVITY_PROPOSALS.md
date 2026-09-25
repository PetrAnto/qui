# Activity proposals — corrected design and open policy amendments

**Status: HYPOTHESIS.** Everything below is a proposal. None of it is
owner-approved, none of it is an ADR, and nothing here changes a `LOCKED`
rule or an `INV-*` invariant. The corresponding code is limited to pure
functions in `packages/core/src/activity/`. They are not exported from the
package root and are not wired into any route, service, repository or UI.

## What exists in code

| Piece | File | State |
|---|---|---|
| Time intervals with time-zone context, per-person availability declarations | `activity/interval.ts` | pure, tested |
| Participation (organizer vs participants), capacity semantics, availability for an appointment or a window | `activity/participation.ts` | pure, tested |
| Declared cost: free / known / estimated / unknown, per-person ceiling | `activity/cost.ts` | pure, tested |
| Equipment needs, contributions, interval-specific coverage | `activity/equipment.ts` | pure, tested |
| Compatibility with reasons, deterministic ordering | `activity/match.ts` | pure, tested |
| Honest description of existing Join/Event signals | `activity/describe.ts` | pure, tested |

The same change also fixes two existing participation bugs, without changing
any permission rule:

- `decideResponse` now validates before its first write. When it accepts into
  a Join or Event, it runs the same `canJoinEvent` check as a direct join
  (live signal, block, host exclusion, audience, capacity). When it accepts an
  Ask or Offer, `canOpenScopedThread` runs before the response is marked
  accepted.
- Repeating a decision has no second effect. Accepting a withdrawn response,
  or declining an accepted one, is a `conflict`. Joining twice creates no
  duplicate row.
- `recordLocalOutcome` accepts only the signal's host, a joined participant,
  or an accepted responder (`canReportOutcome`). It remains a self-report. No
  attendance verification exists.

## Corrected design points

1. **Availability keeps each person's real intervals and their time zone.**
   Nothing is reduced to a yes/no against someone else's window.
   - A *proposed* activity needs an overlap at least as long as its duration.
   - A *scheduled* activity needs one declared interval that contains the
     whole appointment.
   - Moving a date re-checks every declaration. Nobody is confirmed for a time
     they did not name, and equipment availability is never extended to a new
     date.
2. **Equipment has two separate dimensions.**
   - *Use*: `own_use` (serves only its owner, up to their own need) or
     `shareable`.
   - *Status*: `suggested` (an unresolved option such as a rental hut),
     `offered` (for example "I can book a court"), or `confirmed` (the person
     confirms it for the stated times).
   - Only `confirmed` counts, and only for an interval it fully covers.
     `offered` and `suggested` are shown as pending, never as coverage.
   - A required court reservation is met only by a confirmed booking for that
     interval.
   - Each contribution counts once, and only from someone in the activity.
   - Missing equipment is reported and never used to hide an activity.
   - An activity with no needs has no equipment state at all.
   - There is no `verified` or `safe` field. A declared item is not a safety
     certification.
3. **Discovery and joining are separate.** Matching takes no viewer and
   grants nothing. The caller must apply the visibility projection before
   passing activities in; joining stays with `canJoinEvent`. The match input
   and output carry no free text (title, body, meeting point, equipment label)
   and no participant ids. Display text is joined back only after the
   projection. The equipment kind is a closed vocabulary for the same reason.
4. **Existing Join and Event signals are matched, not dropped.**
   `describeSignal` gives them `start_only` timing (they have no end),
   unknown cost, unknown level, no equipment state, and unknown organizer
   participation. An unknown attribute yields `unconfirmed`, never a claimed
   match.
5. **Budget.** A numeric per-person ceiling with a currency sits alongside the
   free / shared-cost preference. An unknown cost, an unsettled split, or a
   cost in another currency cannot satisfy a mandatory ceiling. Estimated and
   known costs are labelled differently. Per-person shares are rounded up.
6. **Participation is explicit.** The organizer is counted once if they take
   part, and not at all otherwise: no place and no personal equipment need,
   though they may lend shareable items.
   - Historical `capacity` keeps its meaning: places for people other than the
     host, since the host has never held a participant row
     (`excludes_organizer`).
   - New models must choose `includes_organizer` explicitly.

## Policy amendments still required before wiring (owner decisions)

"Anyone may propose" is **not** authorization to weaken an age, block,
locality or messaging rule. Each item below needs an owner decision, and the
`LOCKED` ones need a superseding ADR.

| # | Rule | Proposed exact change | Kind |
|---|---|---|---|
| P1 | `INV-HOST-2` / ADR-0010: host power "is granted only to that object's creator" | "…granted only to that object's **designated host**: one adult with a local tie to that place, confirmed by the proposer. A proposal with no designated host has no host powers." | LOCKED text |
| P2 | `INV-DM-1` / ADR-0012: a thread exists only after an accepted response to a live signal | Add a second thread kind: "An activity group thread exists only as a consequence of joining a live Join activity; its members are that activity's members; nothing opens it from a profile, handle or user id." | LOCKED text |
| P3 | `INV-AGE-2`: cross-band contact only "in hosted group contexts, where a host is present" | Define it as: "a designated adult host is a member **and** the group has at least three members. Otherwise the space is read-only for cross-band writing." | LOCKED text (tightening) |
| P4 | `INV-BLOCK-1`: "an existing thread freezes" | Keep it for two-person threads. For group threads: refuse a join when a block exists between the joiner and any member; after the fact, remove each person from the other's view (messages and participant list) instead of freezing the thread for everyone. | LOCKED text |
| P5 | `createSignal` requires `host` for any Join | A Join without a host requires `publish` plus a tie to the city. Hosting stays 18+ with a local tie (ADR-0002/0003 unchanged). | implementation, needs owner OK |
| P6 | Minor-originated proposals | Visible and joinable only within the 15–17 band, with no adult host. For real users, gated on an age-threshold attestation. | privacy/permissions |
| P7 | Participant list visibility | Identities visible to members and host only; everyone else sees counts and coverage. This changes current Join/Event pages. | privacy |

**Limits of P4.** A generic refusal ("unavailable" rather than "blocked")
reduces disclosure, but it cannot make group membership impossible to infer.
A person refused from one activity and accepted into others can narrow down
who is present, especially in a small group or a small town. The rule lowers
the signal; it does not remove it.

## Correction for future connector work

The earlier brief said a stateless signed draft token could be "single-use".
That is wrong. A signature proves integrity and expiry, not consumption. The
same token can be replayed until it expires unless the server records its use.
Single use needs server-side state:

- a nonce or token id stored when first consumed, checked atomically before
  publishing or joining, and kept at least until the token's expiry;
- **or** an idempotency key derived from the user and the draft hash, enforced
  by a unique constraint.

A stateless token also does not replace the human confirmation step inside
QUI. Search must still never publish or join.

## Not done here, deliberately

- No group messaging, host delegation or `minors_only` audience.
- No new analytics events, no attendance confirmation, no reporting subsystem.
- No schema migration, no persistence of plans, availability or contributions.
- No UI, route or connector.
- No payments, custody or partner surfaces.
