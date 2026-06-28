#!/usr/bin/env bash
# Set a Vercel env var on preview for all branches (Vercel API v10).
set -euo pipefail

NAME="${1:?usage: vercel-env-preview-all.sh NAME VALUE}"
VALUE="${2:?usage: vercel-env-preview-all.sh NAME VALUE}"
SENSITIVE="${3:-true}"

AUTH="$HOME/Library/Application Support/com.vercel.cli/auth.json"
PROJECT_JSON="${PROJECT_JSON:-.vercel/project.json}"

TOKEN=$(python3 -c "import json; print(json.load(open('$AUTH'))['token'])")
PROJECT_ID=$(python3 -c "import json; print(json.load(open('$PROJECT_JSON'))['projectId'])")
TEAM_ID=$(python3 -c "import json; d=json.load(open('$PROJECT_JSON')); print(d.get('orgId',''))")

QS=""
if [ -n "$TEAM_ID" ]; then
  QS="?teamId=${TEAM_ID}"
fi

BASE="https://api.vercel.com/v10/projects/${PROJECT_ID}/env"
if [ -n "$QS" ]; then
  UPSERT_URL="${BASE}${QS}&upsert=true"
else
  UPSERT_URL="${BASE}?upsert=true"
fi

BODY=$(python3 -c "
import json, sys
print(json.dumps({
  'key': sys.argv[1],
  'value': sys.argv[2],
  'type': 'encrypted' if sys.argv[3] == 'true' else 'plain',
  'target': ['preview'],
}))
" "$NAME" "$VALUE" "$SENSITIVE")

response=$(curl -sS -X POST "$UPSERT_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY")

python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
if data.get('error') or data.get('failed'):
    print(json.dumps({'error': data.get('error'), 'failed': data.get('failed')}), file=sys.stderr)
    raise SystemExit(1)
" <<< "$response"

echo "Vercel preview (all branches): $NAME"
