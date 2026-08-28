#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${HW_APP_DIR:?HW_APP_DIR is required}"
SERVICE="${HW_SERVICE:?HW_SERVICE is required}"
BRANCH="${HW_BRANCH:-dev}"

cd "$APP_DIR"

if [[ ! -d .git ]]; then
  echo "ERROR: $APP_DIR is not a Git checkout"
  exit 1
fi

OLD_SHA="$(git rev-parse HEAD)"
NEW_SHA=""

rollback() {
  local exit_code=$?
  if [[ -n "$NEW_SHA" && "$OLD_SHA" != "$NEW_SHA" ]]; then
    echo "Deployment failed. Rolling back to $OLD_SHA"
    git reset --hard "$OLD_SHA"
    npm ci
    npm run build
    sudo systemctl restart "$SERVICE"
    sudo systemctl is-active --quiet "$SERVICE"
    echo "Rollback complete. Service restored on $OLD_SHA"
  fi
  exit "$exit_code"
}
trap rollback ERR

echo "Deploying Howling Whispers $BRANCH"
echo "Current commit: $OLD_SHA"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
NEW_SHA="$(git rev-parse HEAD)"

echo "Target commit:  $NEW_SHA"

npm ci
npm run build

sudo systemctl restart "$SERVICE"
sleep 2
sudo systemctl is-active --quiet "$SERVICE"

trap - ERR

echo "Deployment successful: $NEW_SHA"
