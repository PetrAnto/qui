# Contributing

QUI is built in public. Issues, PRs and ADRs are welcome.

## Before you change code

1. Read [AGENTS.md](AGENTS.md) and [docs/SAFETY.md](docs/SAFETY.md).
2. Do not weaken an `INV-*` invariant.
3. Do not add person-level coordinates, a trust score, or a romantic
   surface to this MVP.
4. Do not commit secrets, `.env` files, or real personal data.

## Status words

Use **LOCKED / BASELINE / HYPOTHESIS / OPEN / DEFERRED / OUT OF SCOPE**
exactly as defined in AGENTS.md. An MVP cut is usually DEFERRED, not
OUT OF SCOPE.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:safety
```

## Pull requests

- Small, reviewable, one concern.
- Record a closed option as an ADR.
- Keep demo data obviously fictional.
