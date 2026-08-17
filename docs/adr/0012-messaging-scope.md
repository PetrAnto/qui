# ADR-0012 — Messaging scope: contact begins from a signal

**Status: LOCKED.** `INV-DM-1` does not move without a superseding ADR.

> **Numbering note.** ADR numbers 0001–0011 are cited by number in source
> comments. Messaging scope was documented after them and takes the next free
> number; the invariant it records (`INV-DM-1`) predates this file and is
> enforced in `packages/core/src/types.ts`,
> `packages/core/src/policy/interaction.ts` and
> `packages/core/src/services/write.ts`.

## Context

Every open messaging system converges on the same failure: whoever is willing to
send the most unsolicited messages sets the tone. The usual mitigations — rate
limits, message requests, spam scoring, "you can only message people you follow"
— are all probabilistic patches over a capability that was granted by default.

In a local product the failure is sharper. The recipient's town, workplace and
face are inferable, and the sender is not going away. And the product admits
15–17 year olds, for whom "an adult can open a private conversation with you" is
the first step of the primary threat
([threat-model/MINORS_AND_LOCAL_CONFLICT.md](../threat-model/MINORS_AND_LOCAL_CONFLICT.md),
T1).

## Decision

**There are no unsolicited direct messages, and the capability does not exist.**

A `Thread` exists **only** as a consequence of an accepted response to a live
signal. Concretely:

1. There is **no constructor for a context-free thread** — the type cannot be
   built without the signal context.
2. There is **no service** that opens a conversation from a profile, a person's
   handle, or a user id. Not gated, not rate-limited: absent.
3. A **pending or declined** response does not open a thread. Only an accepted
   one does.
4. A **closed or expired** signal accepts no response, so no thread follows.
5. A **block** freezes an existing thread and prevents any new one, symmetrically
   ([ADR-0010](0010-moderation-hosts-and-blocks.md), `INV-BLOCK-1`).
6. A thread across age bands is refused **even if a response somehow reached
   accepted** — `INV-AGE-2` is checked at thread opening, not only at response
   time, because a single check is a single place to forget.

Contact always starts from something the recipient **chose to publish**. The
person being contacted set the terms: the topic, the moment, and the fact that
they wanted to be contacted at all.

Group contact is the other path, and it is deliberately not private: a hosted
object has a host present, which is what makes mixed-age-band contact acceptable
there and nowhere else.

## Consequences

**Good.** Cold outreach, spam and harassment-by-DM are structurally impossible
rather than filtered — there is no rate limit to tune and no spam model to
train. `INV-AGE-2` and `INV-DM-1` compose into a strong guarantee: an adult
cannot open a private conversation with a minor at all. Every conversation has a
subject, which makes moderation legible when a report arrives.

**Bad.** A real cost to the product: you cannot message someone whose post you
admired, cannot follow up with someone you met at an event unless one of you
publishes, and a lurker who never publishes is unreachable. Whether this
strangles the loop is the open question in
[EXPERIMENTS.md](../EXPERIMENTS.md), E2.

**How that cost may and may not be paid.** If contact concentrates on a few
prolific publishers, the fix is in ranking, in prompting people to publish, or
in more hosted surfaces — **never** in relaxing `INV-DM-1`.

## Alternatives considered

- **Open DMs with rate limiting.** The industry default, and probabilistic. A
  determined sender still gets through, which for the minors threat model is the
  whole ballgame.
- **Message requests / inbox filtering.** The unwanted message still arrives; it
  is just filed elsewhere. The recipient still had no say.
- **DMs unlocked by mutual follow.** Requires a follow graph, which this product
  does not have and does not want ([NON_GOALS.md](../NON_GOALS.md)).
- **DMs between people who share a vouch.** Turns a vouch into a channel of
  access to a third party — precisely the "voucher gains power over the vouched"
  shape [ADR-0003](0003-trust-evidence-capabilities.md) rejects.
