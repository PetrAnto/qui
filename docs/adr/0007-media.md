# ADR-0007 — Media: generated art now, uploads deferred

**Status: DEFERRED** for uploads. **LOCKED** for the rule that uploads ship only
with the full obligation set behind them.

## Context

Every social product wants photos, and photos are how a place looks like itself.
They are also five separate obligations wearing one feature's clothing:

1. **Transcoding and storage** — cost, formats, a pipeline, a bill with an owner.
2. **EXIF stripping** — a phone photo carries GPS coordinates. Accepting uploads
   without stripping metadata would breach `INV-GEO-1` through the back door,
   after all the care taken to keep coordinates off people.
3. **CSAM detection and reporting** — non-negotiable in a product admitting
   minors, with legal reporting duties in every launch jurisdiction.
4. **Takedown and appeal** — a path, staffed, with response times.
5. **Image-based abuse** — harassment, doxxing, revenge material. None of it is
   in the threat model, because the capability does not exist.

A product that ships uploads before all five have owners has not shipped a
feature; it has taken on five liabilities and told users they are safe.

## Decision

**No uploads in this build.** Avatars and imagery are **generated
deterministically from the handle** (`lib/art.ts`, `components/Art.tsx`): the
same person always renders the same way, the visual identity is stable and
recognisable, and no byte of user-supplied image data exists.

Uploads sit behind `mediaUploads` (`INDENOI_FEATURE_MEDIA_UPLOADS`), default
off, enabled only by the exact string `'true'` (`INV-DEMO-1`).

**Enabling that flag requires all five obligations above to have a named owner**
([RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)). This is the locked part: not
"we intend to do these", but each one owned before the flag moves.

`MediaAsset` exists as a type so that generated art and a future uploaded asset
share one shape and no caller changes.

## Consequences

**Good.** Zero storage cost, zero moderation queue for images, zero EXIF risk,
zero CSAM exposure — today. Generated identity also sidesteps a real product
problem: people who will not upload a photo are not second-class here, because
nobody has one.

**Bad.** The product looks more abstract than a photo-led feed, and an Event
signal cannot show the place. This is a genuine loss and the main argument for
revisiting the decision.

**Neutral.** Deterministic art means the visual identity is a pure function of
the handle — cheap, cacheable, and consistent across devices with no pipeline.

## Alternatives considered

- **Ship uploads with EXIF stripping only.** Solves the leak, ignores the other
  four obligations, and is the shape most products actually ship.
- **Third-party image hosting.** Moves storage, not the CSAM, takedown or abuse
  obligations — those stay with whoever runs the product.
- **Avatars only, no content images.** A reasonable middle position, and still
  requires the full obligation set for a much smaller benefit.
- **Let people link an external image URL.** Hotlinking arbitrary URLs is an
  SSRF and content-injection surface, with the same moderation duty and none of
  the control.
