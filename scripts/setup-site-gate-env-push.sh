#!/usr/bin/env bash
# Sync site gate env vars to .env.local and Vercel (all environments).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

export SITE_VISIBILITY_MODE="${SITE_VISIBILITY_MODE:-private}"
export SITE_GATE_PASSWORD="${SITE_GATE_PASSWORD:-123456}"
export SITE_GATE_COOKIE_NAME="${SITE_GATE_COOKIE_NAME:-aftertheparks_site_gate}"

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

upsert_env SITE_VISIBILITY_MODE "$SITE_VISIBILITY_MODE"
upsert_env SITE_GATE_PASSWORD "$SITE_GATE_PASSWORD"
upsert_env SITE_GATE_COOKIE_NAME "$SITE_GATE_COOKIE_NAME"

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
  if [ "${#sensitive_flag[@]}" -gt 0 ]; then
    vercel env add "$name" "$env" --value "$value" --sensitive --yes --force >/dev/null
  else
    vercel env add "$name" "$env" --value "$value" --yes --force >/dev/null
  fi
  echo "  Vercel $env: $name"
}

echo "==> Vercel env"
for env in production preview development; do
  vercel_set SITE_VISIBILITY_MODE "$SITE_VISIBILITY_MODE" "$env"
  vercel_set SITE_GATE_PASSWORD "$SITE_GATE_PASSWORD" "$env"
  vercel_set SITE_GATE_COOKIE_NAME "$SITE_GATE_COOKIE_NAME" "$env"
done

echo "Done. Site gate vars synced to .env.local and Vercel."
