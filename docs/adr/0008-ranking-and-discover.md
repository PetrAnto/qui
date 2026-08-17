# ADR-0008 — Ranking and Discover

**Status: BASELINE** for the weights and inputs. **LOCKED** for determinism, for
the visible rationale, and for safety-before-ranking.

## Context

Discover has to order what a city is saying. The default answer — an opaque
engagement model — is wrong here for three reasons: it optimises for the metric
this product explicitly rejects ([NON_GOALS.md](../NON_GOALS.md)), it cannot be
argued with, and in a small place an unexplained ordering reads as a judgement
about people.

## Decision

**Deterministic and auditable.** The same inputs always produce the same order.
No randomisation, no per-user model, no ambient clock inside the ranking
function — time is passed in.

**The feed explains itself.** The score breakdown is returned with the feed and
rendered on the card. A feed that cannot explain itself is a feed nobody can
argue with — and "argue with it" is the intended relationship between a person
and this product.

**Safety is applied before ranking, by removal.** Blocked content, content the
viewer may not see by age band or audience, suspended accounts and
distribution-restricted content are *removed from the input*, never demoted.
Demotion is a probabilistic guarantee, and a safety rule with a probability
attached is not a safety rule (`INV-BLOCK-1`, `INV-AGE-3`, `INV-AGE-4`,
`INV-SUSPEND-1`).

The ranking function therefore cannot cause a safety failure, whatever its
weights: it only ever reorders things the viewer is already permitted to see.

**No shared cache in front of it** (`INV-CACHE-1`). Every ranked response is
personalised through the viewer's blocks, age band and capabilities.

The weights themselves are BASELINE — expected to change as
[EXPERIMENTS.md](../EXPERIMENTS.md) produces evidence. Changing a weight is
ordinary work; changing determinism, the visible rationale, or the
removal-before-ranking order is not.

## Consequences

**Good.** Bugs are reproducible from inputs alone. The ordering is testable as a
pure function (7 tests in `packages/core/test/ranking.test.ts`). People can see
why something is where it is, which converts an opaque judgement into a
mechanism.

**Bad.** A visible mechanism is a gameable mechanism. Accepted deliberately:
the alternative — security through obscurity of the ranking — buys little and
costs the ability to argue. Determinism also forgoes personalised relevance
learning, which is the point.

**Neutral.** Whether the breakdown should be expanded by default is an open
question ([EXPERIMENTS.md](../EXPERIMENTS.md), E4). Even a negative result would
not justify hiding it entirely.

## Alternatives considered

- **Chronological only.** Honest and unarguable, and in a thin city it buries a
  good Ask under noise. Kept as the fallback shape if ranking proves harmful.
- **Engagement-trained ranking.** Rejected: optimises the metric the product
  rejects, and cannot explain itself.
- **Demote unsafe content rather than remove it.** The single most tempting
  shortcut here, and the one that turns every safety invariant into a
  probability.
