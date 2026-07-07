#!/bin/sh
# Frontend half of the pre-push CI mirror. Assumes `frontend/node_modules` and
# Playwright's browsers are already installed locally (one-time setup, not
# reinstalled on every push).
set -eu
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> mui/emotion guard"
(cd "$REPO_ROOT" && bash frontend/scripts/check-no-mui.sh)

cd "$REPO_ROOT/frontend"

echo "==> npm run build"
npm run build

echo "==> npm run format:check"
npm run format:check

echo "==> npm run lint"
npm run lint

echo "==> npx tsc --noEmit"
npx tsc --noEmit

echo "==> npm run test:coverage"
npm run test:coverage

echo "==> npm run verify:ui"
CI=true npm run verify:ui

echo "==> npm run verify:smoke"
CI=true npm run verify:smoke

echo "==> npm audit --audit-level=high"
npm audit --audit-level=high
