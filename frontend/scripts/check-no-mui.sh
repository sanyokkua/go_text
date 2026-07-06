#!/usr/bin/env bash
# CI guard — fails if @mui or @emotion re-enters the frontend.
# Run from the repo root: bash frontend/scripts/check-no-mui.sh
set -euo pipefail

FAILED=0

if grep -rq "@mui\|@emotion" frontend/src 2>/dev/null; then
    echo "ERROR: @mui or @emotion import found in frontend/src:"
    grep -rn "@mui\|@emotion" frontend/src
    FAILED=1
fi

if grep -q '"@mui\|"@emotion' frontend/package.json 2>/dev/null; then
    echo "ERROR: @mui or @emotion package found in frontend/package.json"
    grep '"@mui\|"@emotion' frontend/package.json
    FAILED=1
fi

if [ "$FAILED" -eq 0 ]; then
    echo "OK: No @mui or @emotion imports found."
fi

exit "$FAILED"
