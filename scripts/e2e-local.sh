#!/usr/bin/env bash
# Runs the mobile smoke suite against a Chromium that is already on disk.
#
# Only needed in environments that cannot reach the Playwright CDN to download
# the exact browser build `@playwright/test` expects. CI does the normal thing
# (`pnpm exec playwright install --with-deps chromium`) and never uses this.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cache="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"

found=""
for candidate in "$cache"/chromium-*/chrome-linux64/chrome; do
  if [ -x "$candidate" ]; then
    found="$candidate"
  fi
done

if [ -z "$found" ]; then
  echo "No local Chromium found under $cache. Run: pnpm exec playwright install chromium" >&2
  exit 1
fi

echo "Using Chromium at $found"
cd "$root"
PLAYWRIGHT_CHROMIUM_EXECUTABLE="$found" exec pnpm exec playwright test "$@"
