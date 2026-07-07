#!/bin/sh
# Go half of the pre-push CI mirror.
set -eu
cd "$(dirname "$0")/../.."

echo "==> gofmt -l ."
unformatted="$(gofmt -l .)"
if [ -n "$unformatted" ]; then
  echo "ERROR: unformatted Go files:" >&2
  echo "$unformatted" >&2
  exit 1
fi

echo "==> go vet ./..."
go vet ./...

echo "==> go test -race ./..."
go test -race ./...

sh scripts/hooks/require-cli.sh govulncheck "go install golang.org/x/vuln/cmd/govulncheck@latest" "vulnerability scanning"
echo "==> govulncheck ./..."
govulncheck ./...

sh scripts/hooks/require-cli.sh wails "go install github.com/wailsapp/wails/v2/cmd/wails@latest" "wails doctor"
echo "==> wails doctor"
wails doctor

sh scripts/hooks/require-cli.sh sqlc "go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest" "schema drift check"
echo "==> sqlc diff"
sqlc diff
