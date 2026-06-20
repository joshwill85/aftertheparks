#!/usr/bin/env bash
# Launches GitHub MCP via Docker, sourcing token from gh CLI keychain.
set -euo pipefail

if [ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]; then
  if command -v gh >/dev/null 2>&1; then
    GITHUB_PERSONAL_ACCESS_TOKEN="$(gh auth token 2>/dev/null || true)"
  fi
fi

if [ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]; then
  echo "GitHub MCP: set GITHUB_PERSONAL_ACCESS_TOKEN or run 'gh auth login'" >&2
  exit 1
fi

export GITHUB_PERSONAL_ACCESS_TOKEN
exec docker run -i --rm \
  -e GITHUB_PERSONAL_ACCESS_TOKEN \
  ghcr.io/github/github-mcp-server
