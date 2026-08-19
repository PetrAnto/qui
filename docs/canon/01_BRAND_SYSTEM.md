# QUI — Brand System

**Status:** CANONICAL — execution-ready baseline  
**Date:** 2026-08-19  
**Scope:** brand identity, visual language, photography, UI styling, light/dark usage  
**Product:** QUI  
**Domain:** `qui.social`

## 0. How agents must use this file

This document is the canonical visual source for QUI unless a later explicit owner decision supersedes it.

Requirement vocabulary:

- **LOCKED** — do not change without explicit owner approval.
- **BASELINE** — implement this unless there is a material reason to propose a change.
- **HYPOTHESIS** — can be prototyped/tested but must not be presented as settled product truth.
- **OPEN** — deliberately unresolved; do not invent a decision.
- **REJECTED** — do not reintroduce without an explicit owner decision.

**Anti-drift rule:** do not blend the dark landing-page mood into the default product UI. QUI has one brand with two presentation modes: a light, human product interface and a darker, cinematic marketing mode.

---

## 1. Brand idea

### LOCKED

QUI is a modern social network centered on **real people, equal standing, active participation and local relevance**.

The brand should feel:

- human, not institutional;
- premium, not luxurious;
- contemporary, not futuristic;
- confident, not aggressive;
- warm, not cute;
- social, not corporate;
- trustworthy without looking like a bank/KYC product;
- active without looking like a fitness-only product.

QUI must never visually collapse into:

- a cyberpunk/crypto aesthetic;
- municipal/civic software;
- a dating-app clone;
- a corporate HR platform;
- a surveillance/security product;
- a generic blue social network.

---

## 2. Logo system

### 2.1 Primary identity — LOCKED direction

The retained logo system is the light-board direction supplied by the owner:

- custom **QUI** wordmark;
- standalone **Q symbol**;
- coral/orange Q ring with a dark lower-right tail;
- three short signal/radiance strokes above the upper-right of the Q when the symbol is used in expressive contexts;
- `qui.social` may appear as a supporting domain line, never as part of the permanent wordmark geometry.

### 2.2 Symbol meaning

The Q symbol may be interpreted visually as:

- the initial of QUI;
- a person/presence inside a local circle;
- a signal becoming visible;
- a connection moving outward.

Do not over-explain these metaphors in normal UI copy.

### 2.3 Approved logo forms

Agents/designers should maintain these assets:

1. `logo-primary` — symbol + QUI wordmark;
2. `logo-symbol` — Q symbol only;
3. `logo-wordmark` — QUI wordmark only;
4. `logo-mono-dark` — one-color Ink version;
5. `logo-mono-light` — one-color Ivory/white version for dark backgrounds;
6. `app-icon` — Q symbol centered on Ink rounded-square background.

### 2.4 Usage rules — BASELINE

- Preserve clear space of at least the symbol tail width around the logo.
- Never stretch, skew, bevel, emboss or add drop-shadow effects to the logo.
- Do not place the coral mark on a visually noisy photo without a protective surface/contrast treatment.
- Do not recolor the primary Q into arbitrary campaign colors.
- Small-size favicon/app-icon variants may simplify the three radiance strokes if legibility requires it.
- The wordmark is a brand asset, not live text recreated with a random font.

### 2.5 Source asset note

The supplied brand-board image is a **visual reference**, not a production-ready vector master. Before final production release, the symbol and wordmark must exist as clean SVG assets with tested small-size rendering.

---

## 3. Color system

### 3.1 Canonical palette — LOCKED

| Token | Hex | Role |
|---|---:|---|
| `coral` | `#FF6B4A` | primary energy, CTA, active accents, brand signal |
| `ink` | `#0F1B2B` | primary text, dark surfaces, structural contrast |
| `deep-teal` | `#2D4E5E` | secondary dark accent, informational depth |
| `sage` | `#A8BFAF` | calm secondary accent, communities/practices/context |
| `stone` | `#F2EEE7` | warm neutral surface |
| `ivory` | `#FAF8F4` | primary light background |

### 3.2 Semantic tokens — BASELINE

Agents should consume semantic variables rather than raw hex values in components.

```text
--color-brand:              #FF6B4A
--color-brand-strong:       derived accessible coral variant
--color-text:               #0F1B2B
--color-text-muted:         derived from Ink
--color-surface:            #FAF8F4
--color-surface-subtle:     #F2EEE7
--color-surface-dark:       #0F1B2B
--color-accent-secondary:   #2D4E5E
--color-accent-soft:        #A8BFAF
```

Accessible state colors for success/warning/error are **BASELINE implementation tokens**, not additional brand colors; they must pass WCAG contrast and must not visually compete with Coral.

### 3.3 Coral usage rule

Coral is an **attention color**, not a page-fill color.

Use it for:

- primary CTA;
- active navigation state;
- selection state;
- key status accents;
- small branded illustrations;
- selected signal/actions;
- controlled marketing emphasis.

Avoid using Coral for large blocks of body text or every icon.

---

## 4. Typography

### 4.1 Wordmark — LOCKED

The QUI wordmark remains a custom asset and must not be recreated from the product typeface.

### 4.2 Product/marketing typography — BASELINE

Use **Geist Sans** as the default implementation baseline for product and web copy until/unless the owner chooses another type family.

Rationale:

- neutral enough to keep photography/humans central;
- strong digital legibility;
- open and production-friendly;
- suitable for both compact mobile UI and large editorial headings.

If a future brand refinement replaces Geist, the replacement must preserve:

- clean geometric/humanist feel;
- excellent mobile readability;
- broad weight support;
- open/commercially safe licensing;
- no overly tech/cyber character.

### 4.3 Type hierarchy — BASELINE

- Display/Hero: 52–72px desktop, 38–48px mobile, weight 600–700, tight tracking.
- H1: 40–56px desktop, 32–40px mobile.
- H2: 30–40px desktop, 26–32px mobile.
- H3: 22–28px.
- Body: 16–18px; 1.45–1.6 line height.
- UI/label: 13–15px, medium weight.
- Overline/meta: 11–13px, uppercase only sparingly.

Avoid excessive all-caps. QUI should feel human, not militaristic.

---

## 5. Iconography

### BASELINE

Iconography should be:

- simple line icons;
- rounded or gently geometric;
- 1.5–2px stroke at standard sizes;
- understandable without decorative detail;
- consistent across product and marketing.

Preferred icon semantics include:

- verified human: shield/person/check;
- trusted invitation: people/invite/check;
- equal standing: balanced/simple equality metaphor, not a leaderboard;
- skill/practice: context-specific tool/activity icon;
- local/city: map pin/building/compass used carefully;
- build together: tool/handshake/project;
- active participation: motion/activity symbol;
- block/report: unmistakable safety icons.

### REJECTED

- cryptocurrency-style glyphs;
- overly glowing sci-fi iconography in the application UI;
- trophies/crowns/stars implying ranked human status;
- iconography that resembles police surveillance or biometric enforcement.

---

## 6. Photography and people imagery

### 6.1 Core rule — LOCKED

**People are the visual center of QUI.**

Photography should make users feel that interesting, real, active humans exist around them.

### 6.2 Preferred imagery

Use images of adults and, where product age rules allow, appropriately represented younger users that feel:

- natural;
- contemporary;
- locally plausible;
- diverse in age, appearance, profession, style and activity;
- active or expressive rather than posed like corporate stock photography;
- warm and dignified;
- visually attractive without reducing people to sexualized inventory.

Show people:

- making things;
- teaching;
- playing music;
- sport/fitness;
- art/design;
- food/craft;
- volunteering/organizing;
- meeting at activities;
- working on projects;
- outdoors and in local places.

### 6.3 Representation rules

- Diversity should look organic, not tokenized.
- Do not signal nationality/ethnicity through stereotypes, flags or costume unless context genuinely requires it.
- Avoid the same narrow age/beauty archetype across all marketing assets.
- Avoid perfect influencer-only imagery.
- Keep attractive people in the visual language; do not sanitize human appeal out of the product.

### 6.4 Authenticity rule

Development/demo imagery may be synthetic or licensed, but it must never be presented as actual QUI users, actual attendance or actual testimonials when it is not.

Public launch marketing should prefer licensed/commissioned/consented photography where a viewer could reasonably infer that the people shown are real community members.

---

## 7. Core components

### BASELINE

The brand system should produce reusable primitives before bespoke screens.

#### Surfaces

- Ivory page surface;
- Stone secondary cards;
- white/ivory elevated cards;
- Ink dark marketing surface;
- subtle 1px dividers rather than heavy card borders.

#### Buttons

- Primary: Coral fill, accessible high-contrast label;
- Secondary: transparent/light surface with Ink border/text;
- Tertiary: text/ghost;
- Destructive: semantic red, never Coral.

#### Cards

Primary card families:

- `PersonCard`;
- `ReelCard`;
- `SignalCard`;
- `PracticeChip` / `SkillChip`;
- `CityContextCard`;
- `ProjectCard`;
- `EventCard`;
- `VerificationCard`;
- `SafetyActionSheet`.

#### Chips/tags

Use warm neutral backgrounds, concise text, restrained color. Chips indicate context, not gamified status.

#### Avatars

- real profile image is prominent;
- verification mark is a small adjacent trust cue, not a giant badge;
- no follower-count halo, VIP ring or paid badge that implies superior standing.

---

## 8. Light mode vs dark mode

### 8.1 Product UI — LOCKED direction

The **default product experience is light**.

Use:

- Ivory/Stone surfaces;
- Ink text;
- Coral actions;
- Sage/Deep Teal for secondary depth;
- natural photography.

The product should feel calm enough for repeated daily use.

### 8.2 Dark mode — BASELINE

A product dark theme may exist, but it should be an adaptation of the same design system, not the glowing network aesthetic from the marketing concept.

### 8.3 Marketing dark mode — LOCKED direction

The retained dark mockup is the reference for **landing-page emotion and narrative intensity**, not for the app chrome.

Marketing dark scenes may use:

- Ink/near-black backgrounds;
- restrained Coral/amber light;
- warm portrait lighting;
- geographic/network lines;
- strong human faces;
- cinematic contrast.

However, implement with canonical Coral/Ink rather than copying arbitrary orange/black values from the mockup.

### 8.4 Rule of thumb

> **Calm in the product. Powerful in the explanation.**

---

## 9. Motion

### BASELINE

Motion should communicate discovery and connection, not spectacle.

Useful motifs:

- subtle Q signal pulse;
- people/cards appearing as geographic context changes;
- smooth city-context transition;
- restrained link/connection line drawing;
- lightweight entrance for Signal responses;
- reduced-motion support everywhere.

Avoid:

- constant glowing/pulsing avatars;
- particle backgrounds inside the product;
- casino-like engagement effects;
- celebratory animations for popularity metrics.

---

## 10. Accessibility and implementation acceptance criteria

A brand implementation is not complete unless:

- text/controls meet WCAG contrast targets;
- keyboard focus is clearly visible;
- motion honors `prefers-reduced-motion`;
- logo SVGs render cleanly at favicon, app-icon and desktop scales;
- color meaning is never the sole signal;
- touch targets are mobile-appropriate;
- light UI remains legible in outdoor/mobile conditions;
- no component encodes VIP/KOL status through visual hierarchy.

---

## 11. Agent anti-drift checklist

Before approving visual work, verify:

- [ ] Does it use the canonical QUI logo rather than inventing a new one?
- [ ] Is the product UI primarily light and human?
- [ ] Is Coral used as an accent rather than flooding the interface?
- [ ] Are people more visually important than metrics?
- [ ] Is there any visual VIP/KOL hierarchy? If yes, remove it.
- [ ] Does dark cinematic styling stay mostly in marketing/hero contexts?
- [ ] Does the design look like a social product rather than KYC/security software?
- [ ] Are demo/synthetic humans clearly non-deceptive?
- [ ] Is accessibility preserved?
