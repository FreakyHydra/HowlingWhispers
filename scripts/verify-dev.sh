#!/usr/bin/env bash
# verify-dev.sh — mandatory end-to-end verification for a dev change.
#
# Builds, lints, tests, restarts the sandbox service, and health-checks it.
# Run from the repo root:  ./scripts/verify-dev.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SANDBOX_URL="${SANDBOX_URL:-https://sandbox.thehowlingwhispers.com}"
SERVICE="thehowlingwhispers-dev.service"

echo "==> lint"
npm run lint

echo "==> test"
npm test

echo "==> build"
npm run build

echo "==> restart sandbox service ($SERVICE)"
systemctl restart "$SERVICE"

echo "==> service active?"
systemctl is-active "$SERVICE"

echo "==> waiting for sandbox to become ready"
ready=0
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null --max-time 3 "$SANDBOX_URL" 2>/dev/null; then
    echo "ready (after ${i}s)"
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" != "1" ]; then
  echo "ERROR: sandbox did not become ready" >&2
  exit 1
fi

echo "==> HTTP health check ($SANDBOX_URL)"
STATUS="$(curl -sS -o /tmp/howling-dev.html -w "%{http_code}" --max-time 30 "$SANDBOX_URL" || true)"
echo "sandbox HTTP $STATUS"
if [ "$STATUS" != "200" ]; then
  echo "ERROR: sandbox did not return HTTP 200" >&2
  exit 1
fi

echo "==> confirm current bundle is served (asset hash in HTML)"
if grep -Eq 'assets/[^"]+\.js' /tmp/howling-dev.html; then
  grep -Eo 'assets/[^"]+\.js' /tmp/howling-dev.html | head -1 | sed 's/^/bundle: /'
else
  echo "WARNING: no JS asset reference found in served HTML" >&2
fi

echo "==> OK: dev change verified and sandbox serving"
