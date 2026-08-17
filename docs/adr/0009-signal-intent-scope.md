# ADR-0009 — Signal intent scope: four intents, and no romantic surface

**Status: LOCKED.** The romantic exclusion is **OUT OF SCOPE**, not deferred.
Adding intents to the union is a normal amendment; adding a romantic one is not.

## Context

The product needs a vocabulary for "the thing I want to say in my town". An open
text field is maximally expressive and minimally useful: nobody knows what to
write, and nothing downstream can reason about it.

A closed vocabulary is a product decision with teeth. It determines what the
product is *for*, and — more importantly — what it is not for.

## Decision

**Four intents, as a closed union** (`SIGNAL_TYPES`):

| Intent | Meaning |
|---|---|
| **Ask** | I need something specific. |
| **Offer** | I have something specific to give or lend. |
| **Join** | I am doing a thing and there is room. |
| **Event** | This is happening, at a time, in a place. |

Extending the union is how *Learn*, *Teach* or *Project* would arrive later —
a type change, an ADR, and a migration.

**There is no romantic or dating intent, and there will not be one in this
product surface** (`INV-ROMANCE-1`). This is enforced structurally: the union
cannot express it, and there is no romantic capability. It is not a backlog
item, not a v2 feature, and not something to be revisited when growth is slow.

### Why romance is excluded, specifically

- The product admits 15–17 year olds ([ADR-0002](0002-age-boundary.md)). Mixing
  a romantic surface into a product with minors creates the single largest
  category of adult–minor risk in social products, and it is the risk that is
  hardest to distinguish from ordinary use.
- Ambiguity is the attacker's tool. Where a romantic intent exists, an approach
  to a minor can always be framed as normal product use. Where it does not, the
  frame is unavailable.
- Local reputation compounds the harm. In a town of 8,000, a rejected advance is
  not anonymous and does not end when the app is closed
  ([threat-model/MINORS_AND_LOCAL_CONFLICT.md](../threat-model/MINORS_AND_LOCAL_CONFLICT.md)).
- Dating changes what every other feature means. Vouching, hosting, appreciation
  and proximity all acquire a second reading, and the safety model would have to
  be rebuilt around it.

The rule is structural rather than a moderation policy because a moderation
policy is a thing people argue about at 2am with a growth number in hand.

## Consequences

**Good.** The threat model shrinks substantially. Every other feature has one
meaning. The product can say what it is in one line, and a person can offer a
lift to a stranger without it being ambiguous.

**Bad.** It forgoes an enormous, proven demand — dating is the strongest
retention driver in local social products. This is a deliberate cost, and the
main pressure that will be brought against this ADR.

**Acknowledged limit.** People will still use *Join* and *Event* to meet
romantically. That is life in a town, and it is not the product's business. What
the product refuses to do is **build the surface**, index for it, or rank on it.

## Alternatives considered

- **A dating mode, adults only.** Doubles the product, doubles the safety model,
  and creates a bright incentive for minors to misdeclare their age — attacking
  the weakest part of [ADR-0002](0002-age-boundary.md).
- **Free-text intent.** Expressive, unreasonable-about, and unmoderatable at
  scale.
- **Allow it and handle it in moderation.** Moves a structural guarantee into a
  staffed process, which is exactly the wrong direction for the highest-severity
  risk in the product.
