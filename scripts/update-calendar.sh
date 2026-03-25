#!/bin/bash
# Update calendar data for ipad-dashboard
# Run via cron every 30 minutes on Mac mini

set -e

REPO_DIR="/tmp/ipad-dashboard"
OUTPUT="$REPO_DIR/data/calendar.json"

mkdir -p "$REPO_DIR/data"

# Fetch today's and tomorrow's events via gog
EVENTS=$(gog calendar events \
  --account jekim14@g.ut.ac.kr \
  --from today --to "$(date -v+2d '+%Y-%m-%d')" \
  --json --no-input 2>/dev/null || echo '[]')

# Write to JSON file
echo "$EVENTS" > "$OUTPUT"

# Git push if changed
cd "$REPO_DIR"
if ! git diff --quiet data/calendar.json 2>/dev/null; then
  git add data/calendar.json
  git commit -m "auto: update calendar data $(date '+%H:%M')" --no-verify
  git push origin main 2>/dev/null
fi
