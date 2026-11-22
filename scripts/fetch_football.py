"""Builds data/football.json: tonight's and tomorrow's big matches Maltese fans follow (Malta time)."""
import json, urllib.request, datetime
from zoneinfo import ZoneInfo

MT = ZoneInfo("Europe/Malta")
UA = {"User-Agent": "Mozilla/5.0 (myRock bot; +https://myrockmalta.com)"}
LEAGUES = [  # (TheSportsDB league name, label) in priority order
    ("UEFA Champions League", "Champions League"),
    ("English Premier League", "Premier League"),
    ("Italian Serie A", "Serie A"),
    ("UEFA Europa League", "Europa League"),
    ("Spanish La Liga", "La Liga"),
    ("French Ligue 1", "Ligue 1"),
    ("German Bundesliga", "Bundesliga"),
    ("UEFA Europa Conference League", "Conference League"),
    ("Maltese Premier League", "Malta Premier League"),
]
import urllib.parse

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

today = datetime.datetime.now(MT).date()
days = [today, today + datetime.timedelta(days=1)]
out, seen = [], set()
import time
names = {c: n for c, n in LEAGUES}
for d in [today - datetime.timedelta(days=1)] + days:
    url = "https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=%s&s=Soccer" % d.isoformat()
    try:
        data = get(url)
    except Exception as e:
        print("skip", d, e); time.sleep(5); continue
    evs = data.get("events") or []
    print(d, len(evs), "soccer events; leagues seen:", sorted({e.get("strLeague") for e in evs})[:40])
    for ev in evs:
        name = names.get(ev.get("strLeague"))
        if not name or ev["idEvent"] in seen or not ev.get("strTimestamp"): continue
        seen.add(ev["idEvent"])
        ko = datetime.datetime.fromisoformat(ev["strTimestamp"].replace("Z", "")).replace(tzinfo=datetime.timezone.utc).astimezone(MT)
        if ko.date() not in days: continue
        status = (ev.get("strStatus") or "").upper()
        done = status in ("FT", "MATCH FINISHED", "AET", "PEN")
        live = status in ("1H", "2H", "HT", "ET", "LIVE")
        hs, as_ = ev.get("intHomeScore"), ev.get("intAwayScore")
        out.append({"league": name, "home": ev["strHomeTeam"], "away": ev["strAwayTeam"], "ko": ko.isoformat(),
                    "state": "post" if done else ("in" if live else "pre"),
                    "score": f"{hs}-{as_}" if (done or live) and hs is not None else "", "clock": status if live else ""})
    time.sleep(3)
prio = {n: i for i, (_, n) in enumerate(LEAGUES)}
out.sort(key=lambda m: (m["ko"][:10], prio[m["league"]], m["ko"]))
res = {"updated": datetime.datetime.now(MT).isoformat(timespec="minutes"), "source": "TheSportsDB", "matches": out}
json.dump(res, open("data/football.json", "w"), ensure_ascii=False, indent=1)
print(len(out), "matches"); print(json.dumps(out[:6], indent=1, ensure_ascii=False))
