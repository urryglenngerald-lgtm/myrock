#!/usr/bin/env python3
"""Gate for myRock events: refuses events that break the house rules.

Usage: python scripts/check_events.py [base_events.json]
The base file is the events list before the change; events that are new or
changed compared with it get the strict checks (future date, poster present).
Exit 0 = clean, 1 = refused (reasons printed).
"""
import json, os, re, sys, datetime, unicodedata

try:
    from zoneinfo import ZoneInfo
    TODAY = datetime.datetime.now(ZoneInfo("Europe/Malta")).date().isoformat()
except Exception:
    TODAY = datetime.date.today().isoformat()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
IMG = re.compile(r"^images/posters/[a-z0-9-]+\.(jpg|jpeg|png|webp)$")
MAX_BYTES = 1_500_000
NEEDED = ["id", "title", "category", "date", "venue", "town", "link", "image", "poster", "posterBy"]


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def load(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    return d["events"] if isinstance(d, dict) else d


def valid_date(s):
    if not isinstance(s, str) or not DATE.match(s):
        return False
    try:
        datetime.date.fromisoformat(s)
        return True
    except ValueError:
        return False


def main():
    errors = []
    try:
        events = load(os.path.join(ROOT, "data", "events.json"))
    except Exception as e:
        print("REFUSED: data/events.json is not valid JSON:", e)
        return 1
    if not isinstance(events, list):
        print("REFUSED: data/events.json must be a list of events")
        return 1

    base = {}
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        try:
            base = {e.get("id"): e for e in load(sys.argv[1])}
        except Exception:
            base = {}

    seen_ids, seen_keys = set(), {}
    for i, e in enumerate(events):
        tag = "event %d (%s)" % (i + 1, e.get("id") or e.get("title") or "no id")
        is_new = bool(base) and (e.get("id") not in base or base.get(e.get("id")) != e)
        if not base:
            is_new = True

        missing = [k for k in NEEDED if e.get(k) in (None, "", False)]
        if missing:
            errors.append("%s: missing %s" % (tag, ", ".join(missing)))

        eid = e.get("id", "")
        if eid and not SLUG.match(eid):
            errors.append("%s: id must be lowercase letters, numbers and dashes" % tag)
        if eid in seen_ids:
            errors.append("%s: duplicate id" % tag)
        seen_ids.add(eid)

        if not valid_date(e.get("date")):
            errors.append("%s: date must be YYYY-MM-DD" % tag)
        if e.get("endDate") and (not valid_date(e["endDate"]) or e["endDate"] < e.get("date", "")):
            errors.append("%s: endDate must be YYYY-MM-DD and not before date" % tag)
        if e.get("time") and not TIME.match(e["time"]):
            errors.append("%s: time must be HH:MM (24h)" % tag)

        link = e.get("link", "")
        if link and not str(link).startswith("https://"):
            errors.append("%s: link must start with https:// (the organiser's or ticket page)" % tag)

        img = e.get("image", "")
        if img:
            if not IMG.match(img):
                errors.append("%s: image must be images/posters/<name>.jpg, .png or .webp" % tag)
            else:
                p = os.path.join(ROOT, img)
                if not os.path.exists(p):
                    errors.append("%s: poster file %s is not in the repo" % (tag, img))
                elif os.path.getsize(p) > MAX_BYTES:
                    errors.append("%s: poster file is over 1.5 MB, resize it" % tag)
                else:
                    try:
                        from PIL import Image
                        with Image.open(p) as im:
                            im.verify()
                    except ImportError:
                        pass
                    except Exception:
                        errors.append("%s: poster file is not a readable image" % tag)

        key = (norm(e.get("title", "")), e.get("date"))
        if key in seen_keys:
            errors.append("%s: same title and date as %s (duplicate)" % (tag, seen_keys[key]))
        seen_keys[key] = eid

        if is_new:
            last = e.get("endDate") or e.get("date") or ""
            if valid_date(last) and last < TODAY:
                errors.append("%s: new or changed event is already over (%s)" % (tag, last))
            if e.get("poster") is not True:
                errors.append("%s: no official poster, no listing (house rule)" % tag)

    if errors:
        print("REFUSED, %d problem(s):" % len(errors))
        for x in errors:
            print(" - " + x)
        return 1
    print("OK: %d events, all clean" % len(events))
    return 0


if __name__ == "__main__":
    sys.exit(main())
