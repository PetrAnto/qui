# Geist Sans — vendored font

The product typeface named by the brand canon (docs/canon/01_BRAND_SYSTEM.md §4.2),
served from this repository through `next/font/local`. No request goes to a
third-party font host.

| | |
|---|---|
| File | `Geist-Variable.woff2` — variable font, weights 100–900 (the 600 heading weight included) |
| Source | npm package `geist@1.7.2`, `dist/fonts/geist-sans/Geist-Variable.woff2` |
| Package integrity | `sha512-Gu5lDFa3pLRyoBlBPf0QIFHVdWAnpco7fS1bJm41jyLPFoguBgiubseUN2oLXMgqZ7uxAxDoXcHMhCY/fOTTgg==` (matches the npm registry) |
| File SHA-256 | `a369fcf5628ea2aa4e1b9e2ec6a5b3624e365bda588e1f0f2f12b564f728fbb8` |
| Licence | SIL Open Font License 1.1 — full text in `OFL.txt`, which must travel with the font |
| Copyright | © 2023 Vercel, in collaboration with basement.studio |

To update: fetch the new package with `npm pack geist@<version>`, check its
integrity against `npm view geist@<version> dist.integrity`, replace both files,
and update this table.
