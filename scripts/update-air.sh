#!/bin/bash
# Update air quality data for ipad-dashboard
# Run via cron every 5 minutes on Mac mini

set -e

REPO_DIR="/tmp/ipad-dashboard"
OUTPUT="$REPO_DIR/data/air.json"

mkdir -p "$REPO_DIR/data"

# Fetch from LG ThinQ API
AIR=$(curl -s \
  -H "Authorization: Bearer thinqpat_0cdb10b46e1d6fbcdb16b67097012cd63865b755d91d7e1dbb8d" \
  -H "x-country: KR" \
  -H "x-client-id: openclaw" \
  -H "x-api-key: v6GFvkweNo7DK7yD3ylIZ9w52aKBU0eJ7wLXkSR3" \
  -H "x-service-phase: OP" \
  -H "x-message-id: dash-$(date +%s)" \
  "https://api-kic.lgthinq.com/devices/c8e72fe199519837e0cfc562b8363995384d6fd38e7044c0969150994df52b3a/state" 2>/dev/null || echo '{}')

# Validate JSON
echo "$AIR" | python3 -m json.tool > /dev/null 2>&1 || exit 1

echo "$AIR" > "$OUTPUT"

# Git push if changed
cd "$REPO_DIR"
if ! git diff --quiet data/air.json 2>/dev/null; then
  git add data/air.json
  git commit -m "auto: update air quality $(date '+%H:%M')" --no-verify
  git push origin main 2>/dev/null
fi
