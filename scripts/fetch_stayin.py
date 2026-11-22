"""Builds data/stayin.json: what Malta is watching on Netflix this week (official Netflix Top 10)."""
import csv, io, json, urllib.request, datetime

UA = {"User-Agent": "Mozilla/5.0 (myRock bot; +https://myrockmalta.com)"}
BASES = ["https://www.netflix.com/tudum/top10/data/", "https://top10.netflix.com/data/"]

def get(name):
    last = None
    for b in BASES:
        try:
            with urllib.request.urlopen(urllib.request.Request(b + name, headers=UA), timeout=60) as r:
                return r.read().decode("utf-8")
        except Exception as e:
            last = e
            print("fail", b + name, e)
    raise last

def top(rows, cat, n=5):
    rows = sorted([r for r in rows if cat in r["category"]], key=lambda r: int(r["weekly_rank"]))[:n]
    out = []
    for r in rows:
        t = r["show_title"].strip()
        s = (r.get("season_title") or "").strip()
        if s and s.upper() != "N/A" and s != t:
            t = s
        out.append({"rank": int(r["weekly_rank"]), "title": t, "weeks": int(r.get("cumulative_weeks_in_top_10") or 1)})
    return out

data = None
try:
    rows = list(csv.DictReader(io.StringIO(get("all-weeks-countries.tsv")), delimiter="\t"))
    mt = [r for r in rows if r.get("country_iso2") == "MT"]
    if mt:
        wk = max(r["week"] for r in mt)
        cur = [r for r in mt if r["week"] == wk]
        data = {"where": "Malta", "week": wk, "tv": top(cur, "TV"), "films": top(cur, "Films")}
except Exception as e:
    print("countries failed:", e)
if not data:
    rows = list(csv.DictReader(io.StringIO(get("all-weeks-global.tsv")), delimiter="\t"))
    wk = max(r["week"] for r in rows)
    cur = [r for r in rows if r["week"] == wk]
    data = {"where": "worldwide", "week": wk, "tv": top(cur, "TV"), "films": top(cur, "Films")}
data["source"] = "Netflix Top 10"
data["updated"] = datetime.date.today().isoformat()
json.dump(data, open("data/stayin.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps(data, indent=1, ensure_ascii=False))
