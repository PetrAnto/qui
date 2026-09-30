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

**The reference image itself was not available** in the working environment when this was built. The palette below is therefore derived from the written description and then tuned for WCAG AA. Neither the brief nor the image supplies an authoritative hex palette. Re-tune the `--qui-*` values in `globals.css` once the image can be compared side by side.

Taken from the reference as inspiration only, never reproduced:
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

- **Person first.** Each card leads with its author, with a larger circular avatar and the name at 1.05rem. The first available action takes the primary style (`PostCard layout="person-first"`). The default card is unchanged.
- **Circular framing, the same for everyone.** Every avatar gets one neutral warm ring. Nothing encodes status: no VIP halo and no badge (canon §7).
- **Light accent.** A single low-alpha ember glow sits behind the page head. There are no particles, networks or scenery in content areas.
- **Typography.** The heading runs 32–48px and the body 16px/1.55. The body font stays the current system stack.
- **Desktop at 64rem and above.** The same five destinations become a left rail, and the feed becomes two columns. These are the canon §1.2 desktop pattern, applied here only.
- **Targets.** Every link and control in the variant clears 44×44 CSS px. Card actions wrap instead of scrolling, so no label breaks and no focus ring is clipped.
- **Focus.** A 3px amber ring with a 2px offset, at 10:1 on the page.

## Proposed tokens

| Token | Value | Role | Contrast |
|---|---|---|---|
| `--qui-night` | `#120d0a` | page (`--color-surface`) | cream 16.6:1 |
| `--qui-night-raised` | `#1c1612` | cards (`--color-surface-raised`) | cream 15.4:1 |
| `--qui-night-subtle` | `#271e18` | chips, quiet fills (`--color-surface-subtle`) | cream 14.1:1 |
| `--qui-cream` | `#f6eddf` | primary text (`--color-text`) | — |
| `--qui-sand` | `#d2c0aa` | secondary text (`--color-text-muted`) | 10.1:1 on raised |
| `--color-text-faint` | `#b4a18b` | meta text | 7.2:1 on raised |
| `--qui-ember` | `#e86a30` | primary action fill (`--color-action`) | label night on ember 6.0:1 |
| `--qui-ember-text` | `#f5955e` | ember as text / active nav (`--color-brand-strong`) | 8.0:1 on raised |
| `--qui-amber` | `#f3b34e` | focus ring, small highlights (`--color-highlight`) | 10.4:1 on page |
| `--color-line` / `--color-line-strong` | `#3b2e25` / `#806a55` | dividers / control outlines | outline 3.5:1 on raised |
| `--color-accent-secondary` | `#1e3944` | Deep Teal, deepened (local-access chip) | chip text 9.7:1 |
| `--color-accent-soft` | `#27352c` | Sage, deepened (context chips) | chip text 9.4:1 |
| `--color-warning` / `-surface` | `#f3c46c` / `#2b2112` | demo banner, "generated" labels | 9.7:1 |
| `--color-danger` | `#ff8f80` | destructive text | 8.1:1 on raised |

`--color-brand` stays canonical Coral `#FF6B4A`, because it colours the Q symbol and the canon forbids recolouring it. On the dark surface the symbol's tail reads Ivory, the same treatment as the app icon (`LogoSymbol surface="dark"`).

Burnt orange is used only for actions. It sits close to Coral, and whether it should replace Coral for actions in any wider dark theme is **OPEN**.

## Verified at 390px and 1440px

Verified 2026-09-30 against a local build:
- **Contrast:** every visible text was checked against its effective background, 380 texts in all, with a minimum of 5.41:1 and no failures.
- **Overflow:** no horizontal overflow.
- **Targets:** no control under 44 CSS px.
- **Keyboard:** every Tab stop shows the ring.
- **Discover interactions:** appreciation toggle and undo, "Why am I seeing this?", Change city, Report or block, and each action's destination all work.
- **Navigation:** For you, People, the tab bar or rail, a person link and "Switch to light" all work.

## Not done here

- No product-wide theme and no persisted theme preference.
- No Geist. The canon asks for it, but it is not integrated anywhere yet.
- No new media, members, badges or claims.
