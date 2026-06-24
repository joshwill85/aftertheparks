#!/usr/bin/env bash
# Resolve a Cloudflare API bearer token for Turnstile provisioning.
# Priority: CLOUDFLARE_API_TOKEN env → Wrangler OAuth token → fail with login hint.
set -euo pipefail

if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "$CLOUDFLARE_API_TOKEN"
  exit 0
fi

wrangler_config() {
  local candidates=(
    "$HOME/Library/Preferences/.wrangler/config/default.toml"
    "$HOME/.wrangler/config/default.toml"
    "$HOME/.config/.wrangler/config/default.toml"
  )
  for f in "${candidates[@]}"; do
    if [ -f "$f" ]; then
      echo "$f"
      return 0
    fi
  done
  return 1
}

CFG="$(wrangler_config || true)"
if [ -n "$CFG" ]; then
  TOKEN=$(python3 -c "
import pathlib, re, sys
text = pathlib.Path(sys.argv[1]).read_text()
for key in ('oauth_token', 'api_token'):
    m = re.search(r'^' + key + r'\\s*=\\s*\"([^\"]+)\"', text, re.M)
    if m:
        print(m.group(1))
        break
" "$CFG" 2>/dev/null || true)
  if [ -n "${TOKEN:-}" ]; then
    echo "$TOKEN"
    exit 0
  fi
fi

echo "No Cloudflare credentials found. Run: npx wrangler login" >&2
echo "Or set CLOUDFLARE_API_TOKEN (Turnstile Sites Write)." >&2
exit 1
