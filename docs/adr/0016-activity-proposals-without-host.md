# ADR-0016 — Activity proposals: proposing is not hosting

**Status: LOCKED** for the scope below: the adult-only synthetic demo.

It is recorded under a **product-owner decision of 2026-09-26** approving
amendments **P1** and **P5** of
[ACTIVITY_PROPOSALS.md](../ACTIVITY_PROPOSALS.md) for that scope. It
**supersedes** the "granted only to that object's creator" wording of
`INV-HOST-2` in [ADR-0010](0010-moderation-hosts-and-blocks.md) and
[SAFETY.md](../SAFETY.md). It **adds** one capability rule next to the table in
[ADR-0003](0003-trust-evidence-capabilities.md).

It changes nothing else. Amendments P2–P4 and P6–P7 remain unapproved:
- no group threads;
- no change to block or age-band rules;
- no minor-originated proposals;
- no change to participant-list visibility.

## Context

The activity search (#46) ends in a preview of the proposal a search would
become. Publishing that proposal under the existing rules is impossible for
most people. A Join or Event requires the `host` capability (18+ and a local
tie), and whoever creates the signal automatically holds every host power over
it. That power set includes accepting, declining, removing and excluding
people.

The owner requirement is that anyone can originate a proposal. Proposing an
intention, taking part, and accepting responsibility as a host are distinct
acts.

## Decision

### 1. Host power follows a designated host, not authorship (P1)

`INV-HOST-2` now reads: host power is local to the hosted object and is granted
only to that object's **designated host**.

- Every signal carries `hostId`.
- For every existing kind of signal, and for every Join or Event created as
  today, `hostId` is the creator. Their behaviour is unchanged.
- An activity proposal has `hostId: null`: **no host powers exist** over it.
  There is nobody who can accept, decline, remove or exclude, and there is no
  host approval path.

The approved P1 target allows an eligible host to be designated and confirmed
by the proposer. **Designating a host is not implemented** in this slice; until
it is, a proposal stays hostless.

### 2. Who may propose (P5)

Publishing an activity proposal requires, checked server-side before any write:

- an active account (a distribution-restricted account keeps its voice; a
  suspended one does not);
- **the adult band** — minor-originated proposals (P6) are not approved;
- the `publish` capability (a verified email);
- **any** attachment to the proposal's city, including `exploring` or
  `visitor`. The service never creates an attachment on the person's behalf.

Hosting keeps its existing, separate requirements (`host`: 18+ and a local tie
to that city, [ADR-0002](0002-age-boundary.md), ADR-0003). An exploring
attachment never qualifies someone to host.

### 3. A hostless proposal cannot be joined or answered (new invariant)

`INV-PROPOSAL-1`:
- A signal with no designated host accepts no join and no response: both are
  refused with `awaiting_host`.
- It opens no thread.
- It gives its proposer no host power and no participation.
- Its proposer is not its host for `INV-OUTCOME-1`.

This keeps every unapproved rule intact. No new joining path exists, so no
group, mixed-age or blocked-pair gathering can form around a hostless proposal.

### 4. One activity identity, structured as proposed

A published proposal is an ordinary `join` Signal, with no separate "request"
object. It carries a `plan`:
- the practice;
- the candidate windows, each keeping its "preferred" flag;
- the time zone and the duration;
- the criteria, each keeping required vs preferred.

It has **no** `startsAt`: a possible window is never turned into an
appointment. Unknown cost and equipment stay unknown.

It is discoverable only through the shared visibility policy (`canViewSignal`)
and matched through the existing matcher.

## Consequences

**Good.**
- Anyone adult with any tie to a city can say "I would like to do this, then"
  and be found by others searching for the same thing.
- No power over other people is created by proposing.

**Bad.**
- A hostless proposal is a dead end until host designation exists. It can be
  found, but nobody can join it yet.
- Without P6, a minor cannot propose.
- **The proposer cannot withdraw.** Closing is a host power and a proposal has
  no host, so a published proposal ends only when its last window passes
  (`expiresAt`) or through moderation. Author withdrawal is not a power over
  anyone else, but it is an owner decision that has not been made yet.

**Neutral.** The D1 adapter reads `hostId` as the creator for every stored row
and refuses to persist a proposal. Production persistence of proposals is out
of scope, and the in-memory demo repository is where they live.

## Alternatives considered

- **Keep creator = host and require `host` to propose.** Rejected by the owner:
  it makes proposing a privilege of adult locals.
- **Create proposals with the proposer as host.** Rejected: it would give an
  explorer or a visitor the power to exclude people from a gathering in a
  city they have no tie to.
- **A separate proposal object converted later into a Join.** Rejected: two
  identities for one activity, with a conversion step that loses history.
