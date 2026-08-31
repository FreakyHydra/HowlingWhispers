#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${HW_APP_DIR:?HW_APP_DIR is required}"
SERVICE="${HW_SERVICE:?HW_SERVICE is required}"
BRANCH="${HW_BRANCH:-dev}"
EXPECTED_SHA="${HW_EXPECTED_SHA:?HW_EXPECTED_SHA is required}"
PREVIOUS_SHA="${HW_PREVIOUS_SHA:-}"
HEALTH_URL="${HW_HEALTH_URL:-https://sandbox.thehowlingwhispers.com}"

cd "$APP_DIR"

if [[ ! -d .git ]]; then
  echo "ERROR: $APP_DIR is not a Git checkout"
  exit 1
fi

CURRENT_SHA="$(git rev-parse HEAD)"
OLD_SHA="${PREVIOUS_SHA:-$CURRENT_SHA}"
NEW_SHA="$CURRENT_SHA"

verify_site() {
  local html_file bundle_path bundle_url status
  html_file="$(mktemp)"

  echo "Waiting for $HEALTH_URL to serve the restarted application..."
  for attempt in $(seq 1 30); do
    status="$(curl -sS -L -o "$html_file" -w '%{http_code}' --max-time 5 "$HEALTH_URL" || true)"
    if [[ "$status" == "200" ]] && grep -Eq 'src="[^"]+\.js' "$html_file"; then
      bundle_path="$(grep -Eom1 'src="[^"]+\.js' "$html_file" | sed -E 's/^src="//')"
      if [[ "$bundle_path" == http://* || "$bundle_path" == https://* ]]; then
        bundle_url="$bundle_path"
      else
        bundle_url="${HEALTH_URL%/}/${bundle_path#/}"
      fi
      if curl -fsS -o /dev/null --max-time 10 "$bundle_url"; then
        echo "Sandbox is healthy. HTTP 200, bundle $bundle_path is available."
        rm -f "$html_file"
        return 0
      fi
    fi
    sleep 1
  done

  echo "ERROR: sandbox did not serve a healthy page and JavaScript bundle" >&2
  rm -f "$html_file"
  return 1
}

if [[ "$NEW_SHA" != "$EXPECTED_SHA" ]]; then
  echo "ERROR: deployment checkout is $NEW_SHA but CI approved $EXPECTED_SHA"
  exit 1
fi

rollback() {
  local exit_code=$?
  trap - ERR
  if [[ -n "$OLD_SHA" && "$OLD_SHA" != "$NEW_SHA" ]]; then
    echo "Deployment failed. Rolling back to $OLD_SHA"
    git reset --hard "$OLD_SHA"
    npm ci
    npm run build
    sudo systemctl restart "$SERVICE"
    sudo systemctl is-active --quiet "$SERVICE"
    verify_site
    echo "Rollback complete. Service restored on $OLD_SHA"
  else
    echo "Deployment failed before a different commit could be restored."
  fi
  exit "$exit_code"
}
trap rollback ERR

echo "Deploying Howling Whispers $BRANCH"
echo "Previous commit: $OLD_SHA"
echo "CI-approved commit: $EXPECTED_SHA"

echo "Building exact CI-approved checkout..."
npm ci
npm run build

sudo systemctl restart "$SERVICE"
sudo systemctl is-active --quiet "$SERVICE"
verify_site

trap - ERR
echo "Deployment successful and sandbox refreshed: $NEW_SHA"
