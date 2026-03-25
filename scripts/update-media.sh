#!/bin/bash
# Fetch latest videos from YouTube channels via RSS
# Output: data/media.json

set -e

REPO_DIR="/tmp/ipad-dashboard"
OUTPUT="$REPO_DIR/data/media.json"
mkdir -p "$REPO_DIR/data"

python3 << 'PYEOF'
import xml.etree.ElementTree as ET
import urllib.request
import json
import sys

CHANNELS = [
    ("UCyn-K7rZLXjGl7VXGweIlcA", "백종원"),
    ("UCX-USfenzQlhrEJR1zD5IYw", "서울의봄"),
    ("UCQ2DWm5Md16Dc3xRwwhVE7Q", "안될과학"),
    ("UCsJ6RuBiTVWRX156FVbeaGg", "지식인미나니"),
    ("UCAuUUnT6oDeKwE6v1NGQxug", "TED"),
    ("UCq8ZAAsI89IoJ-fn1gYpO3g", "Kurzgesagt"),
    ("UC4eYXhJI4-7wSWc8UNRwD4A", "NPR"),
    ("UCupDOc54HJbIPtgLjhABOZw", "SBS"),
]

ns = {
    'atom': 'http://www.w3.org/2005/Atom',
    'yt': 'http://www.youtube.com/xml/schemas/2015',
    'media': 'http://search.yahoo.com/mrss/',
}

videos = []

for ch_id, ch_name in CHANNELS:
    try:
        url = f"https://www.youtube.com/feeds/videos.xml?channel_id={ch_id}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            root = ET.parse(resp).getroot()
        for entry in root.findall('atom:entry', ns)[:2]:
            vid = entry.find('yt:videoId', ns).text
            title = entry.find('atom:title', ns).text
            published = entry.find('atom:published', ns).text
            videos.append({
                "id": vid,
                "title": title,
                "channel": ch_name,
                "channelId": ch_id,
                "published": published,
                "thumb": f"https://img.youtube.com/vi/{vid}/mqdefault.jpg",
            })
    except Exception as e:
        print(f"Warning: {ch_name} failed: {e}", file=sys.stderr)

# Sort by published date descending
videos.sort(key=lambda v: v.get("published", ""), reverse=True)

with open(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ipad-dashboard/data/media.json", "w") as f:
    json.dump({"updated": __import__("datetime").datetime.now().isoformat(), "videos": videos}, f, ensure_ascii=False, indent=2)

print(f"Fetched {len(videos)} videos from {len(CHANNELS)} channels")
PYEOF

# Git push if changed
cd "$REPO_DIR"
if ! git diff --quiet data/media.json 2>/dev/null; then
  git add data/media.json
  git commit -m "auto: update media $(date '+%H:%M')" --no-verify
  git push origin main 2>/dev/null
fi
