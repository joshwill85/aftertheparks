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

BASE="https://api.vercel.com/v10/projects/${PROJECT_ID}/env${QS}"

# Remove existing preview entries for this key (all branches)
EXISTING=$(curl -sfS -H "Authorization: Bearer $TOKEN" "$BASE" | python3 -c "
import json, sys
name = sys.argv[1]
data = json.load(sys.stdin)
for row in data.get('envs', []):
    if row.get('key') == name and 'preview' in (row.get('target') or []):
        print(row['id'])
" "$NAME" || true)

for id in $EXISTING; do
  curl -sfS -X DELETE -H "Authorization: Bearer $TOKEN" "${BASE}/${id}" >/dev/null || true
done

BODY=$(python3 -c "
import json, sys
print(json.dumps({
  'key': sys.argv[1],
  'value': sys.argv[2],
  'type': 'encrypted' if sys.argv[3] == 'true' else 'plain',
  'target': ['preview'],
}))
" "$NAME" "$VALUE" "$SENSITIVE")

curl -sfS -X POST "$BASE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY" >/dev/null

echo "Vercel preview (all branches): $NAME"
