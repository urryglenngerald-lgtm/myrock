"""Downloads each event's official poster (the page's og:image) into images/posters/.
Skips Fever / Candlelight (their own photography). Prints a report for checking."""
import json, re, io, sys, urllib.request, urllib.parse
from PIL import Image

UA = {"User-Agent": "Mozilla/5.0 (Linux; Android 14) myRock poster fetcher"}
SKIP = re.compile(r"feverup\.com|candlelight", re.I)

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read(), r.geturl()

events = json.load(open("data/events.json"))
for e in events:
    if e.get("poster") or SKIP.search(e.get("link", "") + " " + e["title"]):
        print("skip", e["id"]); continue
    try:
        html, final = get(e["link"])
        html = html.decode("utf-8", "ignore")
        m = re.search(r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]+content=["\']([^"\']+)', html) or \
            re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image)', html)
        if not m:
            print("no-image", e["id"]); continue
        src = urllib.parse.urljoin(final, m.group(1).replace("&amp;", "&"))
        data, _ = get(src)
        im = Image.open(io.BytesIO(data)).convert("RGB")
        w, h = im.size
        if w < 300 or h < 200:
            print("too-small", e["id"], w, h, src); continue
        im.thumbnail((1000, 1000))
        out = f"images/posters/{e['id']}.jpg"
        im.save(out, "JPEG", quality=82, optimize=True)
        print("ok", e["id"], f"{w}x{h}", src)
    except Exception as ex:
        print("fail", e["id"], type(ex).__name__, ex)
