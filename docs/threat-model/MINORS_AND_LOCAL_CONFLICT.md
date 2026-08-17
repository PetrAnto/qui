# Threat model — minors and local conflict

**Status: BASELINE.** The mitigations named here are LOCKED where they map to an
`INV-` invariant. The model itself is expected to grow; it has **not** been
reviewed adversarially by anyone outside the people who wrote it, and that
review is a [release blocker](../RELEASE_CHECKLIST.md).

These are the two threats the design actually targets. Everything else — spam,
scraping, platform abuse at scale — matters, but is not what shaped the product.

---

# Part 1 — Minors

## Why this is not the usual "protect the children" model

The product admits 15–17 year olds deliberately
([legal/AGE_BASELINE.md](../legal/AGE_BASELINE.md)). Excluding them would be
easier and would be an abdication. Admitting them means owning the specific ways
an adult can use a local social product to reach a minor.

## Actors

- **A predatory adult** seeking private contact with a minor, patient and
  willing to build a plausible local identity over weeks.
- **A minor** with normal reasons to be here — needing help, offering it,
  wanting to be in the life of their town — and normal susceptibility to
  flattery and to feeling adult.
- **A well-meaning adult** who is not predatory and whose ordinary friendly
  behaviour must not be treated as an attack.

## Attack paths and what stops them

### T1 — Direct approach: adult opens a private conversation with a minor
The classic path. Contact is initiated by the adult, moves quickly to a private
channel, and then out of the product.

**Mitigation (LOCKED).** Two structural rules compose:

- `INV-DM-1` — there is no way to open a conversation with someone who has not
  published something. No API, no service, no type constructor. The minor must
  first choose to say something in public.
- `INV-AGE-2` — a private two-person space never opens across age bands, even
  when a response somehow reached `accepted`. Cross-band contact happens only in
  **hosted group** contexts, where a third party is present and the exchange is
  not private.

Together these mean the direct path does not exist. It is not rate-limited or
scored; it is absent.

**Residual risk.** Age band is self-declared in this build. An adult who
declares 16 is inside the minor band and `INV-AGE-2` then *permits* the private
space. This is the single largest hole in the model. It is the argument for
threshold attestation ([ADR-0006](../adr/0006-kyc-boundary.md)), which is
built but not enabled.

### T2 — Discovery: browsing for minors
An adult uses people discovery to find minors to approach.

**Mitigation (LOCKED).** `INV-AGE-3` — minors do not appear in people discovery
for adults. Not demoted, not behind a filter: removed from the projection.

**Residual risk.** A minor's public signals are still visible to adults in the
city feed — necessarily, or the product does not work for them at all. What is
prevented is *enumeration*: an adult cannot browse a list of minors.

### T3 — Grooming by legitimising: build local standing, then approach
The patient version. Publish helpfully for months, accumulate vouches, become a
recognisable local, then approach.

**Mitigation (partial).** Standing buys no cross-band private access — `INV-AGE-2`
does not have an exception for trusted people, and there is deliberately no trust
score that could grow into one ([ADR-0003](../adr/0003-trust-evidence-capabilities.md)).
Hosting requires 18+, but a host's power is confined to their own object and is
explicitly not moderation (`INV-HOST-2`).

**Residual risk — real and acknowledged.** A hosted event is a legitimate way for
an adult to be in a room with minors. The product cannot and should not prevent
adults from organising local activities that young people attend. What it can do
is refuse to make that contact private, refuse to let it accrue platform
authority, and keep the exchange where others can see it.

### T4 — Moving off-platform
Contact begins here, moves to a service with none of these rules.

**Mitigation (weak, honestly).** Nothing technical prevents this once contact
exists. The rules above constrain *whether contact happens at all*, which is
where the leverage is.

**Open.** Whether the product should warn on off-platform contact patterns is
undecided; detecting it would require reading message content, which has its own
cost. Do not implement a default here.

### T5 — Adult-audience content reaching a minor
**Mitigation (LOCKED).** `INV-AGE-4` — filtered at the projection, not hidden in
the UI.

### T6 — The reporting path fails
A minor reports someone and nothing happens, or the report becomes visible to
the reported person.

**Mitigation (LOCKED for confidentiality).** `INV-MOD-1` — a moderation case is
private to the moderation function; the reported person never sees it; machine
triage may label, never decide.

**Not mitigated: staffing.** A queue with no human behind it is not moderation.
This is a release blocker, not a technical gap.

## Deliberate absences that matter here

- **No romantic surface in the current MVP** (`INV-ROMANCE-1` as an MVP
  constraint; [ADR-0013](../adr/0013-romance-deferred-not-forbidden.md)).
  This removes the largest category of adult–minor risk *today*. Any future
  adult Mutual Signal must remain structurally unavailable to minors — that
  isolation is the LOCKED property, not “romance can never exist”.
- **No person-level location** (`INV-GEO-1`). A minor's signals say which city
  they are in, never where they are.
- **No public counters or scores** — nothing a minor can be flattered by, and
  nothing an adult can accumulate as visible status.

---

# Part 2 — Local conflict

The threat nobody models, and the one that actually ends small-place products.
In a town of 8,000 people, everyone is reachable, everyone has history, and the
consequences of an online interaction are physical and permanent. A product for
local life is a product for local feuds.

## Actors

- **A person with a grievance** — an ex-partner, a neighbour, a former employer,
  a family member — who knows the target's real name, face, workplace and
  routine.
- **A local faction** — political, ethnic, family, or simply a group of friends
  — capable of coordinated action.
- **Someone being pushed out** of the social life of the only town they live in.

## Attack paths and what stops them

### T7 — Surveillance by an abuser or a stalker
Someone the target left is watching what they publish, where they say they are,
who they meet.

**Mitigation (LOCKED).** `INV-BLOCK-1` — a block removes the account in **both
directions**, regardless of who pressed the button: profile, discovery, content,
appreciations, signal eligibility, new threads, participant lists. An existing
thread freezes. Blocked content is *removed* from the ranked feed, never demoted.

Symmetry is the whole point. An asymmetric block leaves the person being escaped
able to watch, which is precisely the failure the button exists to prevent.

**Residual risk.** A blocked person can create a new account. Nothing here
prevents that, and pretending otherwise would be dishonest — mitigation would
require identity verification, which trades one harm for another
([ADR-0006](../adr/0006-kyc-boundary.md)).

### T8 — Coordinated exclusion via vouching
A local group refuses to vouch for an outsider, or vouches only for its own,
turning `publish_local` into a gate controlled by an in-group.

**Mitigation (partial, by design).** Vouches are **one** path to local
publishing, never the only one: an attested or declared local attachment
(`resident`, `work_study`, `second_home`, `origin_family`, `repeated_presence`)
reaches the same capability without anyone's permission. A vouch grants the
voucher **no power over the person vouched for** — it is an input, not a
relationship of authority ([ADR-0003](../adr/0003-trust-evidence-capabilities.md)).

**Residual risk.** Ring behaviour in the other direction — a small closed group
vouching for each other to obtain rights they otherwise would not have. Detection
is unbuilt and is a release-checklist item ([EXPERIMENTS.md](../EXPERIMENTS.md), E3).

### T9 — A host becomes a gatekeeper for the town
Someone hosts most of the events in a small place and uses exclusion to enforce
a social boundary.

**Mitigation (LOCKED).** `INV-HOST-1` / `INV-HOST-2` — an exclusion is permanent
for *that object* and invisible everywhere else. It does not follow the person to
another host's event, does not restrict their account, and is not moderation.
The interface says this in words, because a host who believes they are a
moderator will behave like one
([ADR-0010](../adr/0010-moderation-hosts-and-blocks.md)).

**Residual risk.** In a town with one host, "this object only" is thin comfort.
The structural answer is more hosts, which is a density problem
([EXPERIMENTS.md](../EXPERIMENTS.md), E6), not a permissions problem.

### T10 — Weaponised reporting
A faction mass-reports someone to get them removed.

**Mitigation (partial).** Reports open or join a moderation case; machine triage
labels never decide (`INV-MOD-1`). There is no automatic suspension on report
volume — a count of reports is a count of people with an opinion, not evidence.

**Residual risk.** Rate limiting on reports is unbuilt. Moderator staffing and
an appeal path are release blockers.

### T11 — Exposure of trust state as ammunition
Who vouched for whom, who is verified, who is not — usable to draw factional
lines.

**Mitigation (LOCKED).** `INV-PROFILE-1` — private trust state stays private.
Public projections reduce attestations to coarse booleans: never the method,
provider reference, threshold or timestamps.

### T12 — Silent removal from local life
Someone is suspended or restricted and cannot tell, cannot appeal, and loses the
only local network they have.

**Mitigation (LOCKED).** `INV-SUSPEND-1` — a suspended account retains read
access to its own state so it can appeal. `distribution_restricted` is the
deliberately softer instrument: the person keeps their voice, loses
amplification, and their own content stays visible to them.

**Open.** Whether a host exclusion should be appealable, and to whom, is
undecided ([NON_GOALS.md](../NON_GOALS.md)).

---

## What this model does not cover

- Abuse at scale, spam, bot registration, scraping. Rate limiting is unbuilt.
- Coordinated inauthentic behaviour across cities.
- Legal-process compliance and law-enforcement escalation paths.
- Anything requiring analysis of message content.
- Threats introduced by capabilities that do not exist yet — media uploads in
  particular ([ADR-0007](../adr/0007-media.md)) would add image-based abuse,
  CSAM obligations and EXIF location leakage, none of which are modelled here.
