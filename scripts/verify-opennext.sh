#!/usr/bin/env bash
# Builds the OpenNext Cloudflare worker bundle and optionally boots a short
# workerd/preview smoke. Provisioning and deploy are intentionally out of scope
# (AGENTS.md, docs/RELEASE_CHECKLIST.md, ADR-0011).
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

echo "==> OpenNext Cloudflare build"
pnpm --filter web build:opennext

worker_js="apps/web/.open-next/worker.js"
if [ ! -f "$worker_js" ]; then
  echo "expected worker bundle at $worker_js" >&2
  exit 1
fi

echo "==> worker bundle present: $worker_js ($(wc -c < "$worker_js") bytes)"

# Optional local runtime smoke. Requires wrangler; does not need account auth
# for a temporary preview in most setups. Skip with SKIP_WORKERD_SMOKE=1.
if [ "${SKIP_WORKERD_SMOKE:-0}" = "1" ]; then
  echo "==> skipping workerd smoke (SKIP_WORKERD_SMOKE=1)"
  exit 0
fi

echo "==> workerd/preview smoke (30s budget)"
# Start preview in the background, hit the root, then kill.
pnpm --filter web exec opennextjs-cloudflare preview --port 8788 >/tmp/indenoi-preview.log 2>&1 &
pid=$!
cleanup() {
  kill "$pid" >/dev/null 2>&1 || true
  wait "$pid" 2>/dev/null || true
}
trap cleanup EXIT

ok=0
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:8788/welcome" -o /tmp/indenoi-preview-body.html; then
    if grep -q "Demo build" /tmp/indenoi-preview-body.html; then
      ok=1
      break
    fi
  fi
  sleep 1
done

if [ "$ok" -ne 1 ]; then
  echo "workerd preview smoke failed; last log:" >&2
  tail -n 80 /tmp/indenoi-preview.log >&2 || true
  exit 1
fi

echo "==> workerd preview smoke OK (demo banner present on /welcome)"
