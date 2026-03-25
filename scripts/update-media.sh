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
import os

REPO_DIR = "/tmp/ipad-dashboard"

# Load subscriptions from YouTube API data
SUB_FILE = os.path.join(REPO_DIR, 'data', 'subscriptions.json')
try:
    with open(SUB_FILE) as f:
        CHANNELS = [(ch['id'], ch['name']) for ch in json.load(f)]
except Exception:
    CHANNELS = [
        ("UCyn-K7rZLXjGl7VXGweIlcA", "백종원"),
        ("UCQ2DWm5Md16Dc3xRwwhVE7Q", "안될과학"),
        ("UCsJ6RuBiTVWRX156FVbeaGg", "지식인미나니"),
        ("UCAuUUnT6oDeKwE6v1NGQxug", "TED"),
    ]

ns = {
    'atom': 'http://www.w3.org/2005/Atom',
    'yt': 'http://www.youtube.com/xml/schemas/2015',
    'media': 'http://search.yahoo.com/mrss/',
}

import concurrent.futures
from datetime import datetime

videos = []
errors = 0

def fetch_channel(args):
    ch_id, ch_name = args
    results = []
    try:
        url = f"https://www.youtube.com/feeds/videos.xml?channel_id={ch_id}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            root = ET.parse(resp).getroot()
        for entry in root.findall('atom:entry', ns)[:1]:  # 1 latest per channel
            vid = entry.find('yt:videoId', ns).text
            title = entry.find('atom:title', ns).text
            published = entry.find('atom:published', ns).text
            results.append({
                "id": vid,
                "title": title,
                "channel": ch_name,
                "channelId": ch_id,
                "published": published,
                "thumb": f"https://img.youtube.com/vi/{vid}/mqdefault.jpg",
            })
    except Exception:
        pass
    return results

# Parallel fetch (max 20 concurrent)
with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
    for result in pool.map(fetch_channel, CHANNELS):
        videos.extend(result)

# Sort by published date descending, take top 12
videos.sort(key=lambda v: v.get("published", ""), reverse=True)
videos = videos[:12]

output = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ipad-dashboard/data/media.json"
with open(output, "w") as f:
    json.dump({"updated": datetime.now().isoformat(), "videos": videos, "totalChannels": len(CHANNELS)}, f, ensure_ascii=False, indent=2)

print(f"Fetched {len(videos)} latest videos from {len(CHANNELS)} subscribed channels")
PYEOF

# Git push if changed
cd "$REPO_DIR"
if ! git diff --quiet data/media.json 2>/dev/null; then
  git add data/media.json
  git commit -m "auto: update media $(date '+%H:%M')" --no-verify
  git push origin main 2>/dev/null
fi
