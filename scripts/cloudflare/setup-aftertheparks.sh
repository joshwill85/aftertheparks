#!/usr/bin/env bash
# Apply industry-standard Cloudflare security settings for aftertheparks.com
# Requires: CLOUDFLARE_API_TOKEN with Zone:Read, Zone Settings:Edit, DNS:Edit
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-aftertheparks.com}"
API="https://api.cloudflare.com/client/v4"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Set CLOUDFLARE_API_TOKEN (create at https://dash.cloudflare.com/profile/api-tokens)" >&2
  echo "Use template: Edit zone DNS + Zone Settings" >&2
  exit 1
fi

auth() { curl -sfS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" "$@"; }

ZONE_ID=$(auth "$API/zones?name=$ZONE_NAME" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['id'])")
echo "Zone: $ZONE_NAME ($ZONE_ID)"

patch_setting() {
  local id="$1" value="$2"
  auth -X PATCH "$API/zones/$ZONE_ID/settings/$id" -d "{\"value\":\"$value\"}" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(('OK' if d.get('success') else 'FAIL') + ' $id=$value ' + str(d.get('errors',[])))
"
}

# TLS & HTTPS (industry baseline)
patch_setting ssl full
patch_setting always_use_https on
patch_setting automatic_https_rewrites on
patch_setting min_tls_version 1.2
patch_setting tls_1_3 on
patch_setting opportunistic_encryption on

# HSTS via Transform Rules API (requires Rulesets:Edit on paid plans; fallback documented below)
# Free plan: enable HSTS in SSL/TLS > Edge Certificates dashboard if API unavailable

# DNS for Vercel (proxied orange-cloud)
VERCEL_CNAME="${VERCEL_CNAME:-cname.vercel-dns.com}"
VERCEL_APEX_IP="${VERCEL_APEX_IP:-76.76.21.21}"

upsert_dns() {
  local type="$1" name="$2" content="$3" proxied="${4:-true}"
  local existing
  existing=$(auth "$API/zones/$ZONE_ID/dns_records?type=$type&name=$name" | python3 -c "
import sys,json
r=json.load(sys.stdin).get('result',[])
print(r[0]['id'] if r else '')
")
  local body
  body=$(python3 -c "import json; print(json.dumps({'type':'$type','name':'$name','content':'$content','ttl':1,'proxied':$proxied}))")
  if [ -n "$existing" ]; then
    auth -X PUT "$API/zones/$ZONE_ID/dns_records/$existing" -d "$body" >/dev/null
    echo "Updated DNS $type $name -> $content (proxied=$proxied)"
  else
    auth -X POST "$API/zones/$ZONE_ID/dns_records" -d "$body" >/dev/null
    echo "Created DNS $type $name -> $content (proxied=$proxied)"
  fi
}

upsert_dns CNAME "www.$ZONE_NAME" "$VERCEL_CNAME" true
upsert_dns A "$ZONE_NAME" "$VERCEL_APEX_IP" true

echo "Done. Verify at https://dash.cloudflare.com → $ZONE_NAME → SSL/TLS → Edge Certificates → Always Use HTTPS"
