#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${HW_APP_DIR:?HW_APP_DIR is required}"
SERVICE="${HW_SERVICE:?HW_SERVICE is required}"
BRANCH="${HW_BRANCH:-dev}"
EXPECTED_SHA="${HW_EXPECTED_SHA:?HW_EXPECTED_SHA is required}"
PREVIOUS_SHA="${HW_PREVIOUS_SHA:-}"

cd "$APP_DIR"

if [[ ! -d .git ]]; then
  echo "ERROR: $APP_DIR is not a Git checkout"
  exit 1
fi

CURRENT_SHA="$(git rev-parse HEAD)"
OLD_SHA="${PREVIOUS_SHA:-$CURRENT_SHA}"
NEW_SHA="$CURRENT_SHA"

if [[ "$NEW_SHA" != "$EXPECTED_SHA" ]]; then
  echo "ERROR: deployment checkout is $NEW_SHA but CI approved $EXPECTED_SHA"
  exit 1
fi

rollback() {
  local exit_code=$?
  if [[ -n "$OLD_SHA" && "$OLD_SHA" != "$NEW_SHA" ]]; then
    echo "Deployment failed. Rolling back to $OLD_SHA"
    git reset --hard "$OLD_SHA"
    npm ci
    npm run build
    sudo systemctl restart "$SERVICE"
    sudo systemctl is-active --quiet "$SERVICE"
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
sleep 2
sudo systemctl is-active --quiet "$SERVICE"

trap - ERR
echo "Deployment successful: $NEW_SHA"
