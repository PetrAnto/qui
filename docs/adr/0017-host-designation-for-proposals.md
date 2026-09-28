# ADR-0017 — Designating the host of an activity proposal

**Status: LOCKED** for the scope below: the adult-only synthetic demo.

It implements the rest of amendment **P1**, which the owner approved on
2026-09-26 and [ADR-0016](0016-activity-proposals-without-host.md) records:
host power goes to "one adult with a local tie to that place, **confirmed by
the proposer**." It approves no amendment of its own. P2–P4 and P6–P7 remain
unapproved.

## Context

ADR-0016 made proposing different from hosting. A proposal has `hostId: null`,
and `INV-PROPOSAL-1` keeps it from being joined or answered until a host
exists. That left proposals as a dead end. P1 already says who may become the
host and who confirms them. What was missing was the procedure, and a guarantee
that the procedure cannot be used to impose a host on anyone.

## Decision

### 1. Two explicit acts by two different people (`INV-HOST-3`)

1. **The volunteer offers** (`volunteerToHost`, `canVolunteerToHost`). Only the
   person themself can offer, which records their consent. The offer changes
   nothing on the activity.
2. **The proposer confirms** that same volunteer (`confirmHost`,
   `canConfirmHost`).

Neither person can act alone:
- a proposer cannot name somebody who did not offer (`no_host_offer`);
- a volunteer cannot confirm themself, and a third party cannot confirm anyone
  (`not_proposer`);
- the proposer cannot host their own proposal (`self`).

### 2. The existing host requirements, checked twice

To volunteer, a person needs:
- an active account;
- the `host` capability (18+ and a local tie somewhere);
- **a local tie to the proposal's own city** (`canPublishInGeo`, the rule a
  hosted Join is created under). An exploring or visiting tie never qualifies.

They must also be able to read the proposal: it is not removed, the two people
have not blocked each other, and the proposer is not suspended. The proposal
must still be live.

**At confirmation all of this is checked again**, for both people, together
with the offer itself. Nothing is trusted from the moment of the offer. So a
block, a suspension, a lost tie, closure or expiry that happened since the
offer each refuses the confirmation.

### 3. Atomic and idempotent

The host is installed by `assignSignalHost`, a compare-and-set that succeeds
only while `hostId` is still null. Of two concurrent confirmations, one wins;
the other gets `already_hosted`, or success without effect if it named the same
person. A repeated offer or confirmation is a retry, not a second act. There is
one `host_designated` audit row per activity.

### 4. What designation changes, and what it does not

Only `hostId` changes. The activity keeps its id, its `plan`, its candidate
windows and criteria. `startsAt` stays null. Nobody is joined, and no thread is
opened.

From then on, the existing hosted Join rules apply unchanged:
- **The designated host alone holds host powers** (`INV-HOST-2`).
- **The proposer holds none.** Their confirmation gives them no powers, no
  participation, and no outcome report.
- **Eligibility is checked against both people.** A block with, or the
  suspension of, *either* the proposer or the designated host refuses a join or
  a response. `canRespondToSignal` refuses (`not_host`) any caller that does
  not supply the designated host, so it can never check against the wrong
  person by mistake.
- **Visibility accounts for both people too.** `canReadSignal` and
  `canViewSignal` apply the block (`INV-BLOCK-1`, both directions) and
  suspension rules to the designated host, as they always did to the author.
  So someone blocked with the host neither reads, lists nor finds the activity.
  A distribution-restricted host is not amplified through it. A caller that
  omits a distinct host is refused (`not_host`).

  The proposer keeps reading their own activity. If they are blocked with its
  host, the host is not named to them.
- Age and audience rules are exactly those of an ordinary hosted Join.
- **Having proposed does not make the proposer contactable.** Only a signal
  that a person hosts gives a reason to contact them.

### 5. Visibility of offers

An offer is visible to its volunteer ("you offered") and to the proposer while
the proposal is hostless. Nobody else sees it. The proposer sees an offer only
from someone whose profile they may view.

### 6. Persistence

Offers and designation live in the in-memory demo store, like proposals
themselves. The D1 adapter lists no offers, and refuses to store an offer or
designate a host. Production persistence stays out of scope.

## Consequences

- A proposal can now become a hosted Join without changing identity, so the
  journey is complete: search → propose → volunteer → confirm → join.
- **Not implemented** (none of these is approved):
  - replacing a host, or a host withdrawing;
  - a proposer or volunteer withdrawing an offer;
  - group messaging, equipment UI, payments.

  Once designated, a host stays the host for that activity.
- No analytics event was added; the closed vocabulary is unchanged. Audit rows
  `host_offered` and `host_designated` record both acts.
- **Known limits, left as they are:**
  - The signal page's safety menu (report, block) targets the proposer. The
    designated host can be reported or blocked from their profile, which the
    "Hosted by" card links to.
  - The matcher's descriptive model (`activity/describe.ts`) still names the
    proposer as `organizerId`. It grants no power; it only counts
    participation.
  - Two simultaneous identical first offers can write two `host_offered` audit
    rows. The offer itself is an upsert, so the state stays single.

## Alternatives considered

- **Proposer appoints directly.** Rejected: it imposes a responsibility on
  someone who never agreed to it.
- **First volunteer becomes host automatically.** Rejected: it removes the
  proposer's confirmation, which P1 requires.
- **Make the proposer the co-host.** Rejected: it would give authorship host
  power, contrary to ADR-0016.
