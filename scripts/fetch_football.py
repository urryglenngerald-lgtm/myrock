"""Builds data/football.json: tonight's and tomorrow's big matches Maltese fans follow (Malta time)."""
import json, urllib.request, datetime
from zoneinfo import ZoneInfo

MT = ZoneInfo("Europe/Malta")
UA = {"User-Agent": "Mozilla/5.0 (myRock bot; +https://myrockmalta.com)"}
LEAGUES = [  # order = priority in the app
    ("uefa.champions", "Champions League"),
    ("eng.1", "Premier League"),
    ("ita.1", "Serie A"),
    ("uefa.europa", "Europa League"),
    ("esp.1", "La Liga"),
    ("fra.1", "Ligue 1"),
    ("ger.1", "Bundesliga"),
    ("uefa.europa.conf", "Conference League"),
    ("mlt.1", "Malta Premier League"),
]

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

today = datetime.datetime.now(MT).date()
days = [today, today + datetime.timedelta(days=1)]
out = []
for code, name in LEAGUES:
    seen = set()
    for d in [today - datetime.timedelta(days=1)] + days:  # UTC vs Malta midnight overlap
        try:
            data = get(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{code}/scoreboard?dates={d:%Y%m%d}")
        except Exception as e:
            print("skip", code, d, e); continue
        for ev in data.get("events", []):
            if ev["id"] in seen: continue
            seen.add(ev["id"])
            ko = datetime.datetime.fromisoformat(ev["date"].replace("Z", "+00:00")).astimezone(MT)
            if ko.date() not in days: continue
            comp = ev["competitions"][0]
            teams = {c["homeAway"]: c for c in comp["competitors"]}
            st = ev["status"]["type"]
            out.append({
                "league": name, "code": code,
                "home": teams["home"]["team"].get("shortDisplayName") or teams["home"]["team"]["displayName"],
                "away": teams["away"]["team"].get("shortDisplayName") or teams["away"]["team"]["displayName"],
                "ko": ko.isoformat(),
                "state": st.get("state"),  # pre, in, post
                "score": f'{teams["home"].get("score","")}-{teams["away"].get("score","")}' if st.get("state") != "pre" else "",
                "clock": ev["status"].get("displayClock") if st.get("state") == "in" else "",
            })
prio = {n: i for i, (_, n) in enumerate(LEAGUES)}
out.sort(key=lambda m: (m["ko"][:10], prio[m["league"]], m["ko"]))
res = {"updated": datetime.datetime.now(MT).isoformat(timespec="minutes"), "source": "ESPN", "matches": out}
json.dump(res, open("data/football.json", "w"), ensure_ascii=False, indent=1)
print(len(out), "matches"); print(json.dumps(out[:6], indent=1, ensure_ascii=False))
