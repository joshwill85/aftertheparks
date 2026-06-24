#!/usr/bin/env bash
# Provision My Plan env vars/secrets via CLI:
# - Cloudflare Turnstile (create or reuse widget)
# - CRON_SECRET (generated)
# - .env.local
# - Vercel (production, preview, development)
# - Supabase secrets (TURNSTILE_SECRET_KEY for Auth CAPTCHA)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  if ! npx --yes wrangler whoami 2>/dev/null | rg -q '@'; then
    echo "==> Cloudflare: wrangler login (one-time browser auth)"
    npx --yes wrangler login
  fi
  CLOUDFLARE_API_TOKEN="$(./scripts/cloudflare/get-bearer-token.sh)"
  export CLOUDFLARE_API_TOKEN
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Set CLOUDFLARE_API_TOKEN before running (Turnstile Sites Write)." >&2
  echo "  export CLOUDFLARE_API_TOKEN=..." >&2
  echo "  or: npx wrangler login" >&2
  exit 1
fi

echo "==> Turnstile widget"
if ! eval "$(./scripts/cloudflare/provision-turnstile.sh)"; then
  echo "" >&2
  echo "Turnstile widget API failed (Wrangler OAuth lacks Turnstile Sites Write)." >&2
  echo "Create a widget in Cloudflare Dashboard → Turnstile, add keys to .env.local, then run:" >&2
  echo "  npm run setup:plan-env:push" >&2
  echo "" >&2
  echo "Or create an API token with Turnstile Sites Write and run:" >&2
  echo "  export CLOUDFLARE_API_TOKEN=... && npm run setup:plan-env" >&2
  exit 1
fi

echo "==> CRON_SECRET"
export CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 32)}"

echo "==> .env.local"
touch .env.local
upsert_env() {
  local key="$1" val="$2" file=".env.local"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    python3 -c "
import pathlib, re, sys
p = pathlib.Path('$file')
text = p.read_text()
key = sys.argv[1]
val = sys.argv[2]
pat = re.compile(r'^' + re.escape(key) + r'=.*$', re.M)
line = key + '=' + val
text = pat.sub(line, text) if pat.search(text) else text.rstrip() + '\n' + line + '\n'
p.write_text(text)
" "$key" "$val"
  else
    printf '%s=%s\n' "$key" "$val" >> "$file"
  fi
}

upsert_env NEXT_PUBLIC_TURNSTILE_SITE_KEY "$NEXT_PUBLIC_TURNSTILE_SITE_KEY"
upsert_env TURNSTILE_SECRET_KEY "$TURNSTILE_SECRET_KEY"
upsert_env CRON_SECRET "$CRON_SECRET"

vercel_set() {
  local name="$1" value="$2" env="$3"
  if vercel env ls "$env" 2>/dev/null | rg -q "^ ${name} "; then
    vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
  fi
  if [ "$env" = "preview" ]; then
    ./scripts/vercel-env-preview-all.sh "$name" "$value" true
    return
  fi
  local sensitive_flag=(--sensitive)
  if [ "$env" = "development" ]; then
    sensitive_flag=()
  fi
  vercel env add "$name" "$env" --value "$value" "${sensitive_flag[@]}" --yes --force >/dev/null
  echo "  Vercel $env: $name"
}

echo "==> Vercel env"
for env in production preview development; do
  vercel_set NEXT_PUBLIC_TURNSTILE_SITE_KEY "$NEXT_PUBLIC_TURNSTILE_SITE_KEY" "$env"
  vercel_set TURNSTILE_SECRET_KEY "$TURNSTILE_SECRET_KEY" "$env"
  vercel_set CRON_SECRET "$CRON_SECRET" "$env"
done

echo "==> Supabase secrets (Auth CAPTCHA)"
supabase secrets set "TURNSTILE_SECRET_KEY=$TURNSTILE_SECRET_KEY" --project-ref ujmihdveyqmwehuaqpay

echo ""
echo "Done."
echo "  NEXT_PUBLIC_TURNSTILE_SITE_KEY is set locally + Vercel"
echo "  TURNSTILE_SECRET_KEY is set locally + Vercel + Supabase"
echo "  CRON_SECRET is set locally + Vercel"
echo ""
echo "Enable Turnstile in Supabase Dashboard → Auth → Bot and Abuse Protection"
echo "Schedule cron: POST /api/cron/plan-cleanup with Authorization: Bearer \$CRON_SECRET"
