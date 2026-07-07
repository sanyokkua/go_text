#!/bin/sh
# Fail hard with a copy-pasteable install command if a required CLI is missing.
# Usage: require-cli.sh <binary-name> <install-command> <what-it-is-for>
set -eu

BIN="$1"
INSTALL_CMD="$2"
PURPOSE="$3"

if ! command -v "$BIN" >/dev/null 2>&1; then
  echo "ERROR: '$BIN' is required for $PURPOSE but was not found on PATH." >&2
  echo "" >&2
  echo "One-time install:" >&2
  echo "  $INSTALL_CMD" >&2
  echo "" >&2
  echo "Then make sure \$(go env GOPATH)/bin is on your PATH and retry the push." >&2
  exit 1
fi
