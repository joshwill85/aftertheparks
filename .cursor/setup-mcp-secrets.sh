#!/usr/bin/env bash
# Populate .cursor/mcp.env with GitHub token from gh CLI (not committed to git).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$DIR/mcp.env"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh && gh auth login" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login" >&2
  exit 1
fi

TOKEN="$(gh auth token)"
printf 'GITHUB_PERSONAL_ACCESS_TOKEN=%s\n' "$TOKEN" > "$ENV_FILE"
chmod 600 "$ENV_FILE"
cp "$ENV_FILE" "$HOME/.cursor/mcp.env" 2>/dev/null || true
chmod 600 "$HOME/.cursor/mcp.env" 2>/dev/null || true
echo "Wrote $ENV_FILE (restart Cursor to apply)"
