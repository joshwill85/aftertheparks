#!/usr/bin/env bash
# Create (or reuse) a Turnstile widget for After the Parks My Plan.
# Auth: CLOUDFLARE_API_TOKEN or Wrangler OAuth (npx wrangler login).
set -euo pipefail

API="https://api.cloudflare.com/client/v4"
WIDGET_NAME="${TURNSTILE_WIDGET_NAME:-After the Parks My Plan}"
DOMAINS_JSON="${TURNSTILE_DOMAINS_JSON:-[\"aftertheparks.com\",\"www.aftertheparks.com\",\"localhost\"]}"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  CLOUDFLARE_API_TOKEN="$(./scripts/cloudflare/get-bearer-token.sh)"
  export CLOUDFLARE_API_TOKEN
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Set CLOUDFLARE_API_TOKEN (Turnstile Sites Write permission)" >&2
  exit 1
fi

auth() {
  curl -sfS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" "$@"
}

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
if [ -z "$ACCOUNT_ID" ] && command -v npx >/dev/null 2>&1; then
  ACCOUNT_ID="$(npx --yes wrangler whoami --json 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    accounts = data.get('accounts') or []
    if accounts:
        print(accounts[0]['id'])
except Exception:
    pass
" || true)"
fi

if [ -z "$ACCOUNT_ID" ]; then
  ACCOUNT_ID=$(auth "$API/accounts" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data.get('success'):
    raise SystemExit(data.get('errors', data))
accounts = data.get('result', [])
if not accounts:
    raise SystemExit('No Cloudflare accounts found')
print(accounts[0]['id'])
")
fi

echo "Cloudflare account: $ACCOUNT_ID" >&2

existing=$(auth "$API/accounts/$ACCOUNT_ID/challenges/widgets" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data.get('success'):
    raise SystemExit(data.get('errors', data))
name = '''$WIDGET_NAME'''
for w in data.get('result', []):
    if w.get('name') == name:
        print(json.dumps(w))
        break
" || true)

if [ -n "$existing" ]; then
  echo "Reusing existing Turnstile widget: $WIDGET_NAME" >&2
  sitekey=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['sitekey'])" "$existing")
  detail=$(auth "$API/accounts/$ACCOUNT_ID/challenges/widgets/$sitekey")
  python3 -c "
import json, sys
data = json.loads(sys.argv[1])
if not data.get('success'):
    raise SystemExit(data.get('errors', data))
w = data['result']
print('NEXT_PUBLIC_TURNSTILE_SITE_KEY=' + w['sitekey'])
print('TURNSTILE_SECRET_KEY=' + w['secret'])
" "$detail"
  exit 0
fi

echo "Creating Turnstile widget: $WIDGET_NAME" >&2
body=$(python3 -c "
import json
print(json.dumps({
  'name': '''$WIDGET_NAME''',
  'domains': json.loads('''$DOMAINS_JSON'''),
  'mode': 'invisible',
}))
")

auth -X POST "$API/accounts/$ACCOUNT_ID/challenges/widgets" -d "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data.get('success'):
    raise SystemExit(data.get('errors', data))
w = data['result']
print('NEXT_PUBLIC_TURNSTILE_SITE_KEY=' + w['sitekey'])
print('TURNSTILE_SECRET_KEY=' + w['secret'])
"
