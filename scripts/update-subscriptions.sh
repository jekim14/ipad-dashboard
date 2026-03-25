#!/bin/bash
# Update YouTube subscriptions list from user's account
# Run weekly or manually

set -e

REPO_DIR="/tmp/ipad-dashboard"
OUTPUT="$REPO_DIR/data/subscriptions.json"
TOKEN_FILE="/Users/jemac/.openclaw/workspace/youtube_token.json"

python3 << 'PYEOF'
import json, urllib.request, urllib.parse, sys

TOKEN_FILE = "/Users/jemac/.openclaw/workspace/youtube_token.json"

with open(TOKEN_FILE) as f:
    creds = json.load(f)

# Refresh access token
data = urllib.parse.urlencode({
    'client_id': creds['client_id'],
    'client_secret': creds['client_secret'],
    'refresh_token': creds['refresh_token'],
    'grant_type': 'refresh_token',
}).encode()
req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data)
with urllib.request.urlopen(req) as resp:
    tokens = json.loads(resp.read())
access_token = tokens['access_token']

# Fetch all subscriptions (paginated)
channels = []
page_token = None
while True:
    url = 'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50&order=alphabetical'
    if page_token:
        url += f'&pageToken={page_token}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {access_token}'})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    for item in data.get('items', []):
        s = item['snippet']
        channels.append({
            'id': s['resourceId']['channelId'],
            'name': s['title'],
        })
    page_token = data.get('nextPageToken')
    if not page_token:
        break

output = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ipad-dashboard/data/subscriptions.json"
with open(output, 'w') as f:
    json.dump(channels, f, ensure_ascii=False, indent=2)

print(f"Updated {len(channels)} subscriptions")
PYEOF

# Git push if changed
cd "$REPO_DIR"
if ! git diff --quiet data/subscriptions.json 2>/dev/null; then
  git add data/subscriptions.json
  git commit -m "auto: update subscriptions $(date '+%Y-%m-%d')" --no-verify
  git push origin main 2>/dev/null
fi
