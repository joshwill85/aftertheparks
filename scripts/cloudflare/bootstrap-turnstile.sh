#!/usr/bin/env bash
# Industry-standard Turnstile bootstrap for After the Parks.
# 1. Load CLOUDFLARE_API_TOKEN (env, .env.cloudflare.local, or Vercel)
# 2. Create/reuse invisible Turnstile widget via Cloudflare API
# 3. Sync keys to .env.local, Vercel, Supabase secrets
# 4. Optionally store infra token in Vercel for future runs
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-038f9993bc99b633e35d87e8284d799f}"
TOKEN_URL="https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=%5B%7B%22key%22%3A%22775276e03328400ab3bf647663a8a3a9%22%2C%22type%22%3A%22account%22%7D%5D&name=After%20the%20Parks%20Turnstile"

load_token() {
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
    return 0
  fi
  if [ -f .env.cloudflare.local ]; then
    set -a
    # shellcheck disable=SC1091
    source .env.cloudflare.local
    set +a
  fi
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
    return 0
  fi
  # Infra token stored in Vercel (encrypted) from a prior bootstrap
  if command -v vercel >/dev/null 2>&1; then
    local pulled
    pulled="$(vercel env pull /tmp/atp-vercel-env.$$ --environment=production --yes 2>/dev/null && rg '^CLOUDFLARE_API_TOKEN=' /tmp/atp-vercel-env.$$ | cut -d= -f2- || true)"
    rm -f /tmp/atp-vercel-env.$$
    if [ -n "$pulled" ]; then
      export CLOUDFLARE_API_TOKEN="$pulled"
      return 0
    fi
  fi
  return 1
}

if ! load_token; then
  echo "No CLOUDFLARE_API_TOKEN — opening scoped token creation page…" >&2
  if command -v open >/dev/null 2>&1; then
    open "$TOKEN_URL"
  fi
  echo "Waiting up to 120s for .env.cloudflare.local (CLOUDFLARE_API_TOKEN=…)…" >&2
  for _ in $(seq 1 60); do
    if [ -f .env.cloudflare.local ] && rg -q '^CLOUDFLARE_API_TOKEN=' .env.cloudflare.local 2>/dev/null; then
      set -a
      # shellcheck disable=SC1091
      source .env.cloudflare.local
      set +a
      break
    fi
    sleep 2
  done
fi

if ! load_token; then
  echo "No CLOUDFLARE_API_TOKEN — trying Cloudflare Dashboard automation…" >&2
  if [ ! -f .env.cloudflare.local ] || ! rg -q 'TURNSTILE_SECRET_KEY=' .env.cloudflare.local 2>/dev/null; then
    npx playwright install chromium 2>/dev/null || true
    node ./scripts/cloudflare/create-turnstile-dashboard.mjs || true
    if [ -f .env.cloudflare.local ]; then
      set -a
      # shellcheck disable=SC1091
      source .env.cloudflare.local
      set +a
    fi
  fi
  if [ -n "${TURNSTILE_SECRET_KEY:-}" ] && [ -n "${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-}" ]; then
    export CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 32)}"
    ./scripts/setup-plan-env-push.sh
    echo "Turnstile keys synced (dashboard path)."
    exit 0
  fi
  echo "Cloudflare API token required (Turnstile Sites Write)." >&2
  echo "Opening pre-filled token creation page..." >&2
  if command -v open >/dev/null 2>&1; then
    open "$TOKEN_URL"
  else
    echo "$TOKEN_URL" >&2
  fi
  echo "" >&2
  echo "After creating the token, save it to .env.cloudflare.local:" >&2
  echo '  CLOUDFLARE_API_TOKEN=your-token' >&2
  echo "Then re-run: npm run bootstrap:turnstile" >&2
  exit 1
fi

export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"
eval "$(./scripts/cloudflare/provision-turnstile.sh)"
export NEXT_PUBLIC_TURNSTILE_SITE_KEY TURNSTILE_SECRET_KEY

export CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 32)}"
./scripts/setup-plan-env-push.sh

# Store infra token in Vercel for future automation (encrypted, not used at runtime)
if command -v vercel >/dev/null 2>&1; then
  if ! vercel env ls production 2>/dev/null | rg -q ' CLOUDFLARE_API_TOKEN '; then
    vercel env add CLOUDFLARE_API_TOKEN production \
      --value "$CLOUDFLARE_API_TOKEN" --sensitive --yes --force >/dev/null 2>&1 || true
    echo "Stored CLOUDFLARE_API_TOKEN in Vercel (production, infra-only)."
  fi
fi

echo "==> Supabase config (Auth CAPTCHA)"
if supabase config push --yes 2>/dev/null; then
  echo "Pushed supabase/config.toml (enable Turnstile in Dashboard if not active)."
else
  echo "Run: supabase config push"
  echo "Then Dashboard → Auth → Bot and Abuse Protection → Turnstile"
fi

echo ""
echo "Turnstile bootstrap complete."
