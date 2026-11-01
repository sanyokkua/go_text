#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
: "${SONAR_HOST_URL:?Set SONAR_HOST_URL to the local SonarQube URL}"
: "${SONAR_TOKEN:?Set SONAR_TOKEN to a SonarQube token}"
command -v sonar-scanner >/dev/null || { echo 'sonar-scanner is required' >&2; exit 1; }
command -v wails >/dev/null || { echo 'wails is required to generate frontend bindings' >&2; exit 1; }

rm -f coverage/go.out
rm -rf frontend/coverage
mkdir -p coverage

echo '==> Generate Wails bindings'
wails generate module
echo '==> Build frontend'
(cd frontend && npm run build)
echo '==> Go tests and coverage'
go test -race -coverpkg=go_text,go_text/internal/... -coverprofile=coverage/go.out . ./internal/...
echo '==> Frontend tests and coverage'
(cd frontend && npm run test:coverage)

test -s coverage/go.out
test -s frontend/coverage/lcov.info
echo '==> SonarQube analysis'
sonar-scanner -Dsonar.qualitygate.wait=true -Dsonar.qualitygate.timeout=300
