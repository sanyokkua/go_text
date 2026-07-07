#!/bin/sh
# Regenerate Wails bindings from the developer's current (possibly uncommitted) Go
# changes so the frontend build/typecheck below compiles against fresh types.
#
# frontend/wailsjs/ is gitignored, so `git diff --exit-code` against it is a no-op
# versus git history (unlike in CI, which generates it from scratch each run). The
# value here is purely regenerating before the frontend build step runs next.
set -eu
cd "$(dirname "$0")/../.."

sh scripts/hooks/require-cli.sh wails "go install github.com/wailsapp/wails/v2/cmd/wails@latest" "generating Wails bindings"

echo "==> wails generate module"
wails generate module
