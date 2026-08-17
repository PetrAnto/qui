# Experiments

**Status: OPEN.** Nothing on this page has been run. No experiment in this
document has been executed against a real user, because this build has never
been in front of one.

The purpose of the page is to state, before any data exists, what would count as
evidence — so that a result cannot be reinterpreted after the fact into whatever
the number happened to say.

## Ground rules

1. **Write the falsifier first.** Every experiment names what result would make
   us stop, not only what result would make us continue.
2. **No experiment may weaken a `LOCKED` invariant.** "Does the age-band rule
   cost us engagement" is not an experiment; the answer does not change the
   rule. See [SAFETY.md](SAFETY.md).
3. **Outcome over activity.** The primary metric is `local_outcome_recorded` —
   someone stating that the thing actually happened. Impressions, opens and
   sessions are diagnostic only.
4. **City is a unit of analysis, never a branch.** Comparing two cities is fine;
   shipping different code to them is not ([ADR-0004](adr/0004-geography.md)).
5. **Small n, stated.** With a first cohort measured in dozens, a result is a
   story, not a statistic. Report the n every time.

## Instrumentation available today

The closed event vocabulary (`INV-ANALYTICS-1`, 20 events) already covers the
loop: `city_switched`, `signal_created`, `signal_open`, `signal_response`,
`thread_started`, `message_sent`, `vouch_created`, `local_outcome_recorded`, and
the block/report/invite events. There is no free-form payload and no
time-spent metric, so any experiment that would need one needs an ADR first.

## E1 — Does the four-intent vocabulary fit what people want to say?

**Question.** Is `Ask / Offer / Join / Event` sufficient, or do people bend one
intent to mean something else?

**Method.** Qualitative coding of published signals in the first cohort, plus
the rate of signals abandoned mid-composition.

**Continue if** fewer than ~15% of signals are visibly misfiled.
**Stop / reconsider if** a single unlisted intent accounts for more than ~20% of
what people are trying to say — that is the argument for extending
`SIGNAL_TYPES` (Learn / Teach / Project), which is a type change and an ADR, not
a config toggle.

**Never a valid outcome:** adding a romantic intent
([ADR-0009](adr/0009-signal-intent-scope.md), OUT OF SCOPE).

## E2 — Is signal-gated contact enough, or does it strangle the loop?

**Question.** `INV-DM-1` means you cannot message someone who has published
nothing. Does that starve the product of first contacts?

**Method.** Ratio of people who respond to a signal in week one to people who
publish one. Count of sessions ending at Discover with no action.

**Continue if** a majority of a cohort make contact through someone else's
signal within their first two sessions.
**Reconsider if** contact concentrates on a handful of prolific publishers
(top 10% receiving >70% of responses) — that is a *distribution* problem, to be
fixed in ranking ([ADR-0008](adr/0008-ranking-and-discover.md)) or by prompting
people to publish, **never** by relaxing `INV-DM-1`.

## E3 — Does the vouch path actually unlock local publishing?

**Question.** Two distinct vouchers substitute for an attested local presence.
Does anyone reach `publish_local` that way, or is it decorative?

**Method.** Count of `publish_local` grants by evidence path
(attestation / attachment / vouches). Time from first session to first grant.

**Continue if** the vouch path is used by a non-trivial fraction and produces no
detectable ring behaviour (small closed groups vouching for each other to obtain
publishing rights they would not otherwise have).
**Stop if** ring behaviour appears: raise the threshold, or require the vouchers
themselves to hold independent local evidence. Both are ADR amendments to
[ADR-0003](adr/0003-trust-evidence-capabilities.md).

## E4 — Does a visible score breakdown change behaviour?

**Question.** Discover ships its ranking rationale on the card. Does explaining
the feed make people trust it, game it, or ignore it?

**Method.** Compare cohorts with the breakdown expanded by default versus
collapsed. Diagnostic metric: appreciation and response rates on cards ranked
below the fold.

**Continue if** explanation is neutral or positive on outcomes.
**Note the asymmetry:** even a negative result does not justify hiding the
rationale entirely. Determinism and auditability are the point; the experiment
is about presentation, not about whether the feed explains itself.

## E5 — Are 15–17 year olds actually served, or merely permitted?

**Question.** The age-band rules constrain minors' interactions substantially
(no cross-band private space, absent from adult people-discovery). Do minors
reach a real local outcome, or do they hit walls and leave?

**Method.** Funnel by age band, from onboarding to first `local_outcome_recorded`.
Reports and blocks by band. Qualitative interviews, with guardian consent, ahead
of any quantitative claim.

**Continue if** the minor funnel completes at a comparable rate to the adult
funnel.
**Act if not:** the fix is more hosted group surfaces where mixed-band contact
is safe by construction — **not** loosening `INV-AGE-2`. See
[threat-model/MINORS_AND_LOCAL_CONFLICT.md](threat-model/MINORS_AND_LOCAL_CONFLICT.md).

## E6 — What is the minimum viable density for a city?

**Question.** How many active people does one city need before a signal
reliably gets an answer?

**Method.** Per-city response rate within 48 hours, against active publisher
count. Look for the knee in the curve.

**Why it matters more than anything else here.** Below the threshold the product
does not work anywhere, and no amount of interface improvement compensates. This
is the number that should decide whether to add a city or deepen one.

## Prerequisites before running any of these

- Production authentication ([ADR-0005](adr/0005-authentication-dev-boundary.md))
  and persistence ([ADR-0011](adr/0011-persistence-boundary.md)) — with the demo
  store, everything above resets with the isolate.
- Everything in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md), in particular the
  legal basis for analytics on minors' accounts.
