#!/usr/bin/env bash
# Set a Vercel env var for one target via API (avoids CLI hangs).
# usage: vercel-env-target.sh NAME VALUE TARGET SENSITIVE
set -euo pipefail

NAME="${1:?usage: vercel-env-target.sh NAME VALUE TARGET SENSITIVE}"
VALUE="${2:?usage: vercel-env-target.sh NAME VALUE TARGET SENSITIVE}"
TARGET="${3:?production|preview|development}"
SENSITIVE="${4:-true}"

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

EXISTING=$(curl -sfS -H "Authorization: Bearer $TOKEN" "$BASE" | python3 -c "
import json, sys
name, target = sys.argv[1], sys.argv[2]
data = json.load(sys.stdin)
for row in data.get('envs', []):
    if row.get('key') != name:
        continue
    targets = row.get('target') or []
    if target in targets:
        print(row['id'])
" "$NAME" "$TARGET" || true)

for id in $EXISTING; do
  curl -sfS -X DELETE -H "Authorization: Bearer $TOKEN" "${BASE}/${id}" >/dev/null || true
done

BODY=$(python3 -c "
import json, sys
print(json.dumps({
  'key': sys.argv[1],
  'value': sys.argv[2],
  'type': 'encrypted' if sys.argv[3] == 'true' else 'plain',
  'target': [sys.argv[4]],
}))
" "$NAME" "$VALUE" "$SENSITIVE" "$TARGET")

curl -sfS -X POST "$BASE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY" >/dev/null

echo "  Vercel $TARGET: $NAME"
