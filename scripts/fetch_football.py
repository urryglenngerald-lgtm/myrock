"""Builds data/football.json: tonight's and tomorrow's big matches Maltese fans follow, in Malta time.
Source: football-data.org (free API key in the FOOTBALL_DATA_KEY secret)."""
import json, os, urllib.request, datetime
from zoneinfo import ZoneInfo

MT = ZoneInfo("Europe/Malta")
COMPS = [("CL", "Champions League"), ("PL", "Premier League"), ("SA", "Serie A"),
         ("PD", "La Liga"), ("FL1", "Ligue 1"), ("BL1", "Bundesliga")]
NAMES = dict(COMPS)
PRIO = {c: i for i, (c, _) in enumerate(COMPS)}

now = datetime.datetime.now(MT)
today = now.date()
days = [today, today + datetime.timedelta(days=1)]
res = {"updated": now.isoformat(timespec="minutes"), "source": "football-data.org", "matches": []}

key = os.environ.get("FOOTBALL_DATA_KEY", "").strip()
if not key:
    print("No FOOTBALL_DATA_KEY: keeping the fixtures loaded by hand.")
    raise SystemExit(0)
else:
    url = ("https://api.football-data.org/v4/matches?competitions=%s&dateFrom=%s&dateTo=%s"
           % (",".join(c for c, _ in COMPS), (today - datetime.timedelta(days=1)).isoformat(), days[-1].isoformat()))
    req = urllib.request.Request(url, headers={"X-Auth-Token": key, "User-Agent": "myRock bot"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    for m in data.get("matches", []):
        code = m["competition"]["code"]
        if code not in NAMES: continue
        ko = datetime.datetime.fromisoformat(m["utcDate"].replace("Z", "+00:00")).astimezone(MT)
        if ko.date() not in days: continue
        st = m["status"]
        state = "post" if st in ("FINISHED", "AWARDED") else ("in" if st in ("IN_PLAY", "PAUSED", "LIVE") else ("off" if st in ("POSTPONED", "CANCELLED", "SUSPENDED") else "pre"))
        ft = (m.get("score") or {}).get("fullTime") or {}
        res["matches"].append({
            "league": NAMES[code], "code": code,
            "home": m["homeTeam"].get("shortName") or m["homeTeam"]["name"],
            "away": m["awayTeam"].get("shortName") or m["awayTeam"]["name"],
            "ko": ko.isoformat(), "state": state,
            "score": f'{ft.get("home")}-{ft.get("away")}' if state in ("in", "post") and ft.get("home") is not None else "",
        })
    res["matches"].sort(key=lambda x: (x["ko"][:10], PRIO[x["code"]], x["ko"]))
json.dump(res, open("data/football.json", "w"), ensure_ascii=False, indent=1)
print(len(res["matches"]), "matches")
