# Dark Discover preview

**Status: HYPOTHESIS.** This is a reviewable visual experiment, not the product theme. Broader adoption is pending the owner's visual review.

## Decision it records

- **Owner approval (2026-09-30):** a focused dark Discover, at mobile and desktop sizes, based on an owner-supplied visual reference.
- **Scope of the exception:** for this Discover variant only, it supersedes the rule in [01_BRAND_SYSTEM.md](../canon/01_BRAND_SYSTEM.md) §8.1/§8.3 that reserves dark styling for marketing.
- **What stays as it was:**
  - it authorises no product-wide redesign;
  - the canon is unchanged;
  - the light theme is still the default everywhere.

## Reference

The brief described the reference as:
- deep warm black backgrounds with subtly differentiated surfaces;
- burnt orange primary actions and restrained amber highlights;
- cream primary text with readable warm secondary text;
- people and activities as the focus;
- circular framing and subtle light accents;
- generous typography and spacing.

The reference image (owner-supplied, `QUI social.png`, 1672×941) is a marketing illustration. It is not stored in the repository. The first version of this preview was built from the brief alone, because the image was not reachable yet. It was then compared with the image, and the colours below were sampled from it in Chromium. Sampled values are measurements of a raster, not an authoritative palette. Where a sampled pairing fails WCAG AA, the value was adjusted.

| Reference sample | Measured | Used | Why |
|---|---|---|---|
| Page background | `#020100`–`#180d03` | `#0b0806` page, `#16100c` cards | Near-black and warm, with surfaces kept distinguishable |
| Primary button fill | `#be4014` | `#be4014` | As measured |
| Primary button label | `#f1ccb3` | `#fbf3e8` | The measured label is 3.6:1 on the fill; this is 4.85:1 (AA) |
| Headline | `#ddc09b`, medium weight | `#e6cba4`, weight 600 | Sand-cream, lighter than the previous 800 bold |
| Headline accent word and short rule | `#c23b0e` / `#bd400f` | the action ember `#be4014` | Large text and non-text, 3.7:1 |
| Portrait rings | `#e86b1f`, lit | `#e86b1f` ring with a soft glow | Applied equally to every avatar |
| Secondary button outline | `#6f6759` | `#806a55` | Kept: 3.7:1 on cards, against 3:1 required |
| Caption text | `#5e5c55` | not adopted | Too low contrast; secondary text stays `#d2c0aa` |

Adjusted after the comparison:
- darker page and card surfaces;
- burnt-orange action fill with a light label;
- lighter-weight sand-cream headline with an ember accent on "actually do" and a short ember rule;
- lit orange rings on every avatar;
- slightly larger avatars in the people strip (later made compact; see "First viewport").

Not taken from the reference: the glowing network lines, particles, city scenery and walking figure. Everyday content areas stay calm. Taken as inspiration only, never reproduced:
- **Its raster wordmark.** The canon's custom wordmark still has no vector master, so the variant uses the existing Q symbol geometry (`LogoSymbol`), not a lettered wordmark.
- **Its portraits.** No portrait is used or presented as a user. People appear as the existing generated avatars and labelled "generated" artwork.
- **Its claims.** Claims such as "No fake accounts" or "Verified Human" are not adopted.

## How to open it

Open `/?theme=dark` while signed in to the demo. The exact value `dark` is required; anything else renders the light Discover.

The variant renders a `.discover-dark` marker. Every rule in the "dark Discover preview" section of `apps/web/app/globals.css` is keyed on that marker, through `:root:has(.discover-dark)` or `.discover-dark`. As a result:

- the demo banner and the navigation shell follow the variant on that screen only;
- every other route, including `/people` and the tab destinations, stays light;
- the light Discover renders a DOM identical to `main`, verified against the 70f617f build for `/`, `/signals` and `/people`.

"Switch to light" and the Discover tab return to `/`.

## What it changes, and what it does not

Only presentation changes. The variant uses:
- the same `getDiscoverFeed` result, ranking, contextual actions, safety menu and demo banner;
- the same persona session;
- production flags that are all still off.

The people strip is a preview of the existing People mode. It shows `getPeopleInCity`, so `canDiscoverUser` still applies: blocks, restricted accounts, and no minors shown to adults (INV-AGE-3).

Changes to presentation only:

- **Person first.** Each card leads with its author: a circular avatar and the name at 1.05rem. The caption comes next, with the generated artwork beside it as a labelled thumbnail (88px on a phone, 120px on desktop) instead of filling the card. The first available action takes the primary style (`PostCard layout="person-first"`). The default card is unchanged.
- **Circular framing, the same for everyone.** Every avatar gets the same lit orange ring with a soft glow, as in the reference's portraits. Nothing encodes status: no VIP halo and no badge (canon §7).
- **Light accent.** A single low-alpha ember glow sits behind the page head. There are no particles, networks or scenery in content areas.
- **Typography.** The heading runs about 25–38px, weight 600, in sand-cream, with "actually do" as the ember accent and a short ember rule below. The intro copy is 14.4px/1.45; captions are 16px/1.5. The font stays the current system stack.
- **Desktop at 64rem and above.** The same five destinations become a left rail, and the feed becomes two columns. These are the canon §1.2 desktop pattern, applied here only.
- **Targets.** Every link and control in the variant clears 44×44 CSS px. Card actions wrap instead of scrolling, so no label breaks and no focus ring is clipped.
- **Focus.** A 3px amber ring with a 2px offset, at 10:1 on the page.

## Proposed tokens

| Token | Value | Role | Contrast |
|---|---|---|---|
| `--qui-night` | `#0b0806` | page (`--color-surface`) | cream 17.2:1 |
| `--qui-night-raised` | `#16100c` | cards (`--color-surface-raised`) | cream 16.3:1 |
| `--qui-night-subtle` | `#211913` | chips, quiet fills (`--color-surface-subtle`) | cream 14.9:1 |
| `--qui-cream` | `#f6eddf` | primary text (`--color-text`) | — |
| `--qui-heading` | `#e6cba4` | headline | 12.8:1 on page |
| `--qui-sand` | `#d2c0aa` | secondary text (`--color-text-muted`) | 10.7:1 on raised |
| `--color-text-faint` | `#b4a18b` | meta text | 7.6:1 on raised |
| `--qui-ember` | `#be4014` | action fill (`--color-action`), headline accent and rule | label 4.85:1; 3.7:1 as large text or non-text |
| `--color-on-action` | `#fbf3e8` | label on action | 4.85:1 |
| `--qui-ember-text` | `#f5955e` | ember as small text / active nav (`--color-brand-strong`) | 8.4:1 on raised |
| `--qui-glow` | `#e86b1f` | portrait rings | 6.2:1 on page |
| `--qui-amber` | `#f3b34e` | focus ring, small highlights (`--color-highlight`) | 10.8:1 on page |
| `--color-line` / `--color-line-strong` | `#3b2e25` / `#806a55` | dividers / control outlines | outline 3.7:1 on raised |
| `--color-accent-secondary` | `#1e3944` | Deep Teal, deepened (local-access chip) | chip text 9.7:1 |
| `--color-accent-soft` | `#27352c` | Sage, deepened (context chips) | chip text 9.4:1 |
| `--color-warning` / `-surface` | `#f3c46c` / `#2b2112` | demo banner, "generated" labels | 9.7:1 |
| `--color-danger` | `#ff8f80` | destructive text | 8.5:1 on raised |

`--color-brand` stays canonical Coral `#FF6B4A`, because it colours the Q symbol and the canon forbids recolouring it. On the dark surface the symbol's tail reads Ivory, the same treatment as the app icon (`LogoSymbol surface="dark"`).

Burnt orange `#be4014` is used only for actions and the headline accent. It is deeper than Coral, and whether it should replace Coral for actions in any wider dark theme is **OPEN**.

## First viewport

The page is compacted so that actual content appears before any scrolling. At 390×844 and 1440×900, the first post's author, its caption and its first contextual action are fully visible: below the demo banner, and above the bottom navigation on a phone. To get there:

- **Two header rows.** The Q symbol shares the city row, and "Switch to light" shares the For you / People row. On a phone the "Dark preview" label is visually hidden but still read by screen readers.
- **Tighter spacing.** The section gap is 12px, and the heading and its rule are smaller.
- **A compact people strip.** It is a single row of pills (avatar, name, first practice). It scrolls sideways, and "See everyone" opens the People mode.
- **Smaller artwork.** The generated artwork becomes a thumbnail beside the caption. It keeps its "generated" label and its accessible description.

Nothing was removed. Every action, the safety menu, the city picker, the policy filters and the 44×44 CSS px targets are unchanged.

When the first post is the viewer's own, its contextual actions are disabled, as they are in the light Discover. The first action is then visible but not primary.

## Verified at 390px and 1440px

Verified against a local build. The exact revision and results are in the review archive's `verification.json`.
- **Contrast:** every visible text was checked against its effective background, with no failures. The thresholds are 4.5:1 for normal text and 3:1 for large text; the ember headline accent is large text at 3.7:1.
- **Overflow:** no horizontal overflow.
- **Targets:** no control under 44 CSS px.
- **Keyboard:** every Tab stop shows the ring.
- **Discover interactions:** appreciation toggle and undo, "Why am I seeing this?", Change city, Report or block, and each action's destination all work.
- **Navigation:** For you, People, the tab bar or rail, a person link and "Switch to light" all work.

## People strip

The strip is the People mode's data: `getPeopleInCity`, which applies `canDiscoverUser` for each person. That covers:
- self;
- blocks in either direction, and suspension (`canViewProfile`);
- loss of the discovery capability, as for restricted accounts;
- minors never shown to adults (INV-AGE-3).

`apps/web/test/discover-dark.test.ts` renders the preview and checks four things:
- the strip equals the People mode's list;
- it shows no minor to an adult;
- it drops a person blocked in either direction, and a suspended account;
- the light Discover renders no strip.

The test reads the strip by its `dd-person__name` class, so it does not depend on the layout.

## Not done here

- No product-wide theme and no persisted theme preference.
- No Geist. The canon asks for it, but it is not integrated anywhere yet.
- No new media, members, badges or claims.
