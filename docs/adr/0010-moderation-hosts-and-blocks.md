# ADR-0010 — Moderation, hosts and blocks

**Status: LOCKED.** `INV-BLOCK-1`, `INV-HOST-1`, `INV-HOST-2`, `INV-MOD-1` and
`INV-SUSPEND-1` do not move without a superseding ADR.

## Context

Three different powers get conflated in social products, and the conflation is
where the harm comes from:

- **A block** — I do not want this person in my life.
- **A host exclusion** — you are not welcome at *my* gathering.
- **Moderation** — this account broke the rules of the platform.

Merging any two produces a predictable failure. Community moderation in a small
town is not distributed responsibility; it is a faction with a ban button.

## Decision

### Blocks are symmetric and total

`INV-BLOCK-1`. Whoever pressed the button, the two accounts stop existing for
each other: profile, discovery, content, appreciations, signal eligibility, new
threads, participant-list projections. An existing thread freezes rather than
vanishing, so neither person loses the record of what was said.

**Blocked content is removed from ranked feeds, never demoted.** Demotion is a
probability; a safety rule with a probability is not a safety rule.

Symmetry is not politeness. An asymmetric block leaves the person being escaped
able to watch — the exact failure the button exists to prevent
([threat-model/MINORS_AND_LOCAL_CONFLICT.md](../threat-model/MINORS_AND_LOCAL_CONFLICT.md),
T7).

### Host power is local to the hosted object

`INV-HOST-1`, `INV-HOST-2`. A host decides who is in *their* gathering, and
nothing else. An exclusion is permanent for that object — no rejoining, no
further response on it — and **invisible everywhere else**: it does not follow
the person to another host's event, it does not restrict their account, and it
is not moderation.

Powers are granted only to that object's creator. **Hosts are not moderators**,
and the interface says so in words, because a host who believes they are a
moderator will behave like one.

### Moderation is a platform function, and it is private

`INV-MOD-1`. A report opens or joins a moderation case. The case is never
visible to the reported person; the reporter sees only their own report;
moderators see the case. Machine triage labels may be attached — **they never
decide**.

There is no automatic suspension on report volume. A count of reports is a count
of people with an opinion, not evidence, and volume-triggered action is exactly
the mechanism a local faction would use
([threat-model/MINORS_AND_LOCAL_CONFLICT.md](../threat-model/MINORS_AND_LOCAL_CONFLICT.md),
T10).

### Two account sanctions, deliberately unequal

`INV-SUSPEND-1`.

- **`suspended`** — holds no capability at all; the account and its content
  disappear; it can respond to nothing. It **retains read access to its own
  state**, so the person can see what happened and appeal.
- **`distribution_restricted`** — the softer, and expected more common,
  instrument: the person keeps their voice but loses amplification. Out of
  people discovery, filtered from other people's ranked feeds, still fully
  visible to its author.

Having a proportionate option matters. Where the only tool is removal, removal
is what gets used.

## Consequences

**Good.** Each power does one thing, and none of them can be laundered into
another. Someone excluded from one gathering keeps their whole local life
elsewhere. A restriction does not silently disappear a person.

**Bad.** Real moderation staffing is required, and there is none — a
[release blocker](../RELEASE_CHECKLIST.md), not a technical gap. In a town with
one host, "this object only" is thin comfort; the structural answer is more
hosts, which is a density problem, not a permissions problem.

**Open.** Whether a host exclusion should be appealable, and to whom
([NON_GOALS.md](../NON_GOALS.md)).

## Alternatives considered

- **Community moderation / trusted-user powers.** Rejected: a faction with a ban
  button, and it needs the trust ladder [ADR-0003](0003-trust-evidence-capabilities.md)
  forbids.
- **Asymmetric ("soft") blocks.** Preserves the watching, which is the harm.
- **Auto-suspend on N reports.** Hands a coordinated group a removal mechanism.
- **Host exclusions that follow a person.** Turns a private judgement into a
  town-wide sanction with no process behind it.
