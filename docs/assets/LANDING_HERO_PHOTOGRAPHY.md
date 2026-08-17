# Landing hero photography — provenance

**Verification date:** 2026-08-17.

This file exists so a future maintainer can answer *why we are legally
comfortable using these images, and where they came from*, without
reconstructing the research.

These photographs illustrate a concept. They are **not** product identities.
They must never be attached to a demo persona, a city, a practice, a testimonial,
or any sentence that would make a visitor think the depicted people use, live
near, or endorse QUI / indenoi.

Copyright permission is not automatically evidence of personality / publicity
rights. Residual risk is recorded below.

Replacement procedure: pick another image from
[landing-hero-candidates.md](landing-hero-candidates.md) whose rights-confidence
is `high` or `medium`, update `apps/web/lib/landing-hero.ts`, replace the
optimized file in `apps/web/public/landing-hero/`, and keep this document in
sync.

## Final assets

### `photographer-street.webp`

| Field | Value |
|---|---|
| Local file | `apps/web/public/landing-hero/photographer-street.webp` |
| Source page | https://commons.wikimedia.org/wiki/File:Street_woman_photographer_(49205775828).jpg |
| Direct asset | https://upload.wikimedia.org/wikipedia/commons/7/71/Street_woman_photographer_%2849205775828%29.jpg |
| Creator | Pedro Ribeiro Simões (Lisboa) |
| Platform | Wikimedia Commons, originally Flickr |
| Licence | CC BY 2.0 |
| Attribution required | Yes — “Pedro Ribeiro Simões” + licence + link |
| Modifications | Cropped; converted to WebP; resized to 1400px |
| Commercial-use notes | CC BY 2.0 permits commercial reuse with attribution |
| Personality-right notes | Identifiable contemporary person. Commons lists no `Restrictions: personality`. No model-release evidence. **Residual publicity-right risk.** Editorial framing only. Visible Nikon markings are incidental equipment. |
| Why selected | Dominant image: a real activity in a real public place. Not a dating-app pose. Independent review (F09) accepted this frame. |
| Represented life stage | Young adult (visual estimate only; not a claim) |

### `carpenter-workshop.webp`

| Field | Value |
|---|---|
| Local file | `apps/web/public/landing-hero/carpenter-workshop.webp` |
| Source page | https://commons.wikimedia.org/wiki/File:A_carpenter_creating_measurements.jpg |
| Direct asset | https://upload.wikimedia.org/wikipedia/commons/c/c8/A_carpenter_creating_measurements.jpg |
| Creator | Rwebogora |
| Platform | Wikimedia Commons |
| Licence | CC BY-SA 4.0 (Commons API, 2026-08-17) |
| Attribution required | Yes; share-alike applies to adaptations |
| Modifications | Converted to WebP; resized to 960px wide |
| Commercial-use notes | CC BY-SA 4.0 permits commercial reuse with attribution and SA |
| Personality-right notes | Identifiable contemporary person. No model-release evidence. **Residual publicity-right risk.** |
| Why selected | Authentic workshop practice. Replaced a posed field-guitar portrait. |
| Represented life stage | Adult (visual estimate only) |

### `street-accordion.webp`

| Field | Value |
|---|---|
| Local file | `apps/web/public/landing-hero/street-accordion.webp` |
| Source page | https://commons.wikimedia.org/wiki/File:A_Street_Musician_(25517139).jpeg |
| Direct asset | https://upload.wikimedia.org/wikipedia/commons/2/2a/A_Street_Musician_%2825517139%29.jpeg |
| Creator | Sergey Ivanov |
| Platform | Wikimedia Commons / 500px Archive Team import |
| Licence | CC BY-SA 3.0 (Commons API, 2026-08-17; Restrictions empty) |
| Attribution required | Yes; share-alike applies to adaptations |
| Modifications | Cropped toward the musician to exclude shopping-bag marks; converted to WebP |
| Commercial-use notes | CC BY-SA 3.0 permits commercial reuse with attribution and SA |
| Personality-right notes | Identifiable contemporary person. No model-release evidence. **Residual publicity-right risk.** Face turned toward the instrument. |
| Why selected | Replaced a second camera portrait (camera-club reading) and a Pexels busker cliché. Mature adult, public practice, not a headshot. |
| Represented life stage | Mature adult (visual estimate only) |

### `skate-park.webp`

| Field | Value |
|---|---|
| Local file | `apps/web/public/landing-hero/skate-park.webp` |
| Source page | https://www.pexels.com/photo/teenage-boys-skateboarding-in-skate-park-at-sunset-17024829/ |
| Creator | Wallace Chuck |
| Platform | Pexels |
| Licence | Pexels License (photo page retrieved 2026-08-17) |
| Attribution required | No; credited anyway |
| Modifications | Converted to WebP; CSS crop toward the activity, not faces |
| Commercial-use notes | Website / commercial use and modification allowed. Implied endorsement and standalone resale prohibited. |
| Personality-right notes | Source title describes the subjects as teenagers. Faces are largely in shadow / turned away. **No sensual styling.** Selection criterion was sport only. Residual minor-publicity risk: replace if a jurisdiction treats this as commercial advertising of identifiable minors. Landing copy does not name them or call them users. |
| Why selected | Intergenerational breadth via sport, not attractiveness. Independent review (F10) accepted this frame. |
| Represented life stage | Young person / teenager (source description; not an exact-age claim) |

### `history-fisherman.webp`

| Field | Value |
|---|---|
| Local file | `apps/web/public/landing-hero/history-fisherman.webp` |
| Source page | https://commons.wikimedia.org/wiki/File:Eiland_Marken_-_Visser_1900.jpg |
| Creator | Unknown. Library of Congress photochrome, “Eiland Marken — Visscher”, ca. 1900 |
| Platform | Wikimedia Commons / Library of Congress |
| Licence | Public domain |
| Attribution required | No (credited for honesty) |
| Modifications | Caption cropped; tighter figure crop; greyscale WebP; low-opacity luminosity blend |
| Commercial-use notes | Public-domain photochrome |
| Personality-right notes | Historical. Residual risk treated as low. |
| Why selected | The only historical layer. Cropped so the figure reads as a quiet memory behind contemporary people, not a museum card. |
| Represented life stage | Historical |

## Independent visual review

An independent creative-director review of an earlier screenshot set
(`deleg_5caa3fda`, 2026-08-17) classified 21 findings. Actions taken:

| ID | Classification | Response |
|---|---|---|
| F01 empty mobile well | REJECT | Mobile now keeps carpenter + accordion + skate; no hidden support tiles. |
| F02 invisible fisherman | REJECT | Tighter figure crop, higher opacity, corner texture on all breakpoints. |
| F03 age-gate first action | REJECT | **Kept.** Age is a LOCKED onboarding gate (ADR-0002). Visual hero sits above it; the question is not redesigned away. |
| F04 / F05 global stock mosaic | MODIFY | Dropped Pexels busker and second camera. Four contemporary frames, three Commons. Credits no longer name stock agencies in the primary path. |
| F06 dating-onboarding rhyme | MODIFY | Removed the tight older-woman face crop. Remaining faces are practice-first. |
| F07 camera club | MODIFY | Only one photographer remains. |
| F08 mature headshot | MODIFY | Replaced with accordion musician. |
| F09 street photographer | ACCEPT | Kept as dominant. |
| F10 skate | ACCEPT | Kept. |
| F11 Pexels busker | MODIFY | Replaced with Commons accordionist. |
| F12 carpenter as diversity token | MODIFY | Kept for craft authenticity; reduced the occupation checkerboard by dropping the second photographer. |
| F14 brand coral unused | MODIFY | Larger coral wordmark, coral underline on the headline, stronger coral ring. |
| F19 credits advertise Pexels | MODIFY | Credits now list photographers only; licences live in this file. |

This is not a legal opinion.

## Residual risks

1. **No model-release file** for any contemporary subject.
2. **Personality / publicity rights** can still restrict commercial advertising of a recognisable face. Mitigation: editorial framing, explicit non-endorsement copy, no fake profiles.
3. **Camera-brand marks** appear in the dominant photograph. Incidental, not advertised.
4. **One Pexels photo is described by its source as teenage.** Sport-first, faces not the crop, not paired romantically with an adult.
5. A swimsuit accordion portrait, a posed field-guitar portrait, a second camera headshot, and a Pexels sidewalk guitarist were **removed after visual review**.
