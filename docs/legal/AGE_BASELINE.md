# Age baseline

**Status: BASELINE (15+).** The threshold is a deliberate current position,
expected to be re-examined per launch jurisdiction. The safety invariants built
on top of it (`INV-AGE-1` … `INV-AGE-4`) are **LOCKED** and do not move if the
threshold does.

**This document is not legal advice.** It records the reasoning and the sources
we relied on so that a lawyer can check the work. Legal review is a
[release blocker](../RELEASE_CHECKLIST.md).

## The decision

`MINIMUM_AGE_YEARS = 15`. Below 15 the product does not create an account at
all: `ageBandFromAge()` returns `null` rather than a band, so there is no code
path that can produce an under-15 actor
([ADR-0002](../adr/0002-age-boundary.md)).

Age is stored as a **band** — `minor_15_17` or `adult_18_plus` — never as a date
of birth and never as a number. Onboarding takes a declared age, derives the
band, and discards the input. Nothing downstream can ask "how old is this
person" because nothing downstream is given the answer.

## Why 15

**GDPR Article 8** sets the age of consent for information society services
offered directly to a child at **16**, while allowing Member States to lower it
to **no less than 13**. France legislated **15**.

Choosing 15 is a France-first legal and product **baseline**, not an EU-wide
legal conclusion. Article 8 allows Member States to keep the default at 16 or
lower it to a value from 13 to 15. A 15-year-old therefore cannot necessarily
consent alone to consent-based processing in every EU Member State. France's
threshold also does not create a general "digital majority": contract capacity,
the processing's actual legal basis, parental authority, platform duties and
child-safety rules remain separate questions.

**Before launch in any country:** obtain jurisdiction-specific legal review,
apply the local Article 8 threshold where consent is the legal basis, and check
all additional duties for services accessible to minors. Until that review and
proportionate age assurance exist, this build is a synthetic demo rather than a
public-minor onboarding system.

## Why not simply exclude minors

Excluding 15–17 year olds from a product about local life is not a safety
strategy — it is an abdication that pushes them onto services with weaker rules
and then claims credit for it. The design keeps them in, with structural
protection:

- No private two-person space across age bands (`INV-AGE-2`). Adults and minors
  can still meet in **hosted group** contexts, where a host is present and the
  exchange is not private.
- Minors do not appear in people discovery for adults (`INV-AGE-3`).
- Adult-audience content never reaches a minor surface (`INV-AGE-4`).
- Hosting and vouching require 18+ — both carry responsibility over other
  people, including the power to exclude someone from a space.
- No romantic or dating surface exists in the **current MVP**
  (`INV-ROMANCE-1` as an MVP constraint). Any future adult romantic
  capability must remain structurally unavailable to minors
  ([ADR-0013](../adr/0013-romance-deferred-not-forbidden.md)).

## Age assurance — what we do and do not claim

In this build the age is **self-declared**. That is stated plainly in the
onboarding copy, and it is exactly as weak as it sounds.

What the architecture supports, but does not run: an `age_threshold_verified`
attestation from a hosted provider, carrying only the threshold that was checked
(15 or 18) and a yes/no. The document never crosses the boundary and there is no
field that could hold one (`INV-KYC-1`,
[ADR-0006](../adr/0006-kyc-boundary.md)). Live verification sits behind the
`liveIdentityVerification` flag, which is off, and no provider contract exists.

This matters for the CNIL position summarised below: age verification must not
become a general identification requirement, and a scheme that makes every user
prove who they are in order to prove they are old enough trades one harm for a
larger one. Threshold-only, provider-held, double-blind by construction is the
target shape.

## Sources

**Link status: verified by the executor on 2026-08-16 using official-source web
search results.** This is source verification, not legal advice. Regulator sites
reorganise; re-check each link and its publication date during legal review.

| Last checked | By | Notes |
|---|---|---|
| 2026-08-16 | Hermes executor | Official CNIL, EUR-Lex and Legifrance sources located; legal interpretation still requires counsel. |

### EU law

- **GDPR, Regulation (EU) 2016/679 — Article 8** (conditions applicable to
  child's consent in relation to information society services). Official
  Journal, ELI permalink:
  <https://eur-lex.europa.eu/eli/reg/2016/679/oj>
- Same text via CELEX (navigate to Article 8):
  <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679>
- Consolidated version:
  <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504>

Article 8(1) in substance: where consent is the basis for processing in relation
to information society services offered directly to a child, processing is
lawful where the child is at least 16; Member States may provide for a lower
age, not below 13.

### France — CNIL

- **CNIL recommendation 1 — regulate minors' capacity to act online**. It
  expressly warns that 15 is not a general digital majority and discusses
  conditions for a minor to join an online service:
  <https://www.cnil.fr/fr/recommandation-1-encadrer-la-capacite-dagir-des-mineurs-en-ligne>
- **CNIL recommendation 4 — seek parental consent below 15**:
  <https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans>
- **CNIL recommendation 7 — verify age and parental agreement while respecting
  privacy**, including proportionality, minimisation and reasonable-efforts
  guidance:
  <https://www.cnil.fr/fr/recommandation-7-verifier-lage-de-lenfant-et-laccord-des-parents-dans-le-respect-de-sa-vie-privee>
- **CNIL on online age verification** — the balance between protecting minors
  and respecting private life, and the case against schemes that require
  general identification:
  <https://www.cnil.fr/fr/verification-de-lage-en-ligne-trouver-lequilibre-entre-protection-des-mineurs-et-respect-de-la-vie>
- **CNIL, minors' section** (entry point, if the specific pages above have
  moved): <https://www.cnil.fr/fr/thematiques/mineurs>

### France — statute

- **Loi n° 78-17 du 6 janvier 1978 (Informatique et Libertés)**, which sets the
  French digital-consent age at 15:
  <https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000886460/>

## Open questions

Do not resolve these by picking a default:

- Does the baseline stay 15 in every launch country, or vary per jurisdiction?
  A per-country threshold is expressible (the attestation already carries a
  `country` field) but multiplies the rule surface.
- What is the parental-consent path for an under-15, if the product ever admits
  one? Today there is none, by design: the answer is "no account".
- What legal basis covers analytics on a minor's account?
  ([RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md))
- Is self-declared age defensible for a first cohort, or is threshold
  attestation a launch requirement rather than a later one?
