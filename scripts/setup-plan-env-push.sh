#!/usr/bin/env bash
# Push Turnstile + CRON env vars to .env.local, Vercel, and Supabase.
# Use when keys already exist (Cloudflare dashboard or .env.local).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${NEXT_PUBLIC_TURNSTILE_SITE_KEY:?Set NEXT_PUBLIC_TURNSTILE_SITE_KEY in .env.local or env}"
: "${TURNSTILE_SECRET_KEY:?Set TURNSTILE_SECRET_KEY in .env.local or env}"

export CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 32)}"

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
  if [ "$env" = "preview" ]; then
    ./scripts/vercel-env-preview-all.sh "$name" "$value" true
    return
  fi
  local sensitive_flag=(--sensitive)
  if [ "$env" = "development" ]; then
    sensitive_flag=()
  fi
  vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
  vercel env add "$name" "$env" --value "$value" "${sensitive_flag[@]}" --yes --force >/dev/null
  echo "  Vercel $env: $name"
}

echo "==> Vercel env"
for env in production preview development; do
  vercel_set NEXT_PUBLIC_TURNSTILE_SITE_KEY "$NEXT_PUBLIC_TURNSTILE_SITE_KEY" "$env"
  vercel_set TURNSTILE_SECRET_KEY "$TURNSTILE_SECRET_KEY" "$env"
  vercel_set CRON_SECRET "$CRON_SECRET" "$env"
done

echo "==> Supabase secrets"
supabase secrets set "TURNSTILE_SECRET_KEY=$TURNSTILE_SECRET_KEY" --project-ref ujmihdveyqmwehuaqpay

echo "Done. Turnstile keys synced to .env.local, Vercel, and Supabase."
