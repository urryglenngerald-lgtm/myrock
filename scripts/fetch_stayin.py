"""Builds data/stayin.json for the Staying in panel.
- Netflix: official Netflix Top 10 for Malta (weekly).
- HBO Max, Prime Video, Disney+, Apple TV: most popular titles available on each in Malta, from TMDB
  (needs the TMDB_KEY secret; skipped without it).
Every title gets an IMDb link (the exact page when TMDB knows it, otherwise an IMDb search)."""
import csv, io, json, os, re, urllib.request, urllib.parse, datetime

UA = {"User-Agent": "Mozilla/5.0 (myRock bot; +https://myrockmalta.com)"}
KEY = os.environ.get("TMDB_KEY", "").strip()
IMG = "https://image.tmdb.org/t/p/w342"

def http(url, headers=None):
    with urllib.request.urlopen(urllib.request.Request(url, headers={**UA, **(headers or {})}), timeout=60) as r:
        return r.read().decode("utf-8")

def tmdb(path, **q):
    h = {}
    if KEY.startswith("eyJ"):
        h["Authorization"] = "Bearer " + KEY
    else:
        q["api_key"] = KEY
    return json.loads(http("https://api.themoviedb.org/3" + path + "?" + urllib.parse.urlencode(q), h))

def imdb_search(title):
    return "https://www.imdb.com/find/?q=" + urllib.parse.quote(title)

def enrich(kind, tid):
    """kind tv|movie, TMDB id -> (imdb url or None)"""
    try:
        ids = tmdb(f"/{kind}/{tid}/external_ids")
        return f"https://www.imdb.com/title/{ids['imdb_id']}/" if ids.get("imdb_id") else None
    except Exception:
        return None

# ---------- Netflix official Top 10 (Malta) ----------
def netflix():
    for base in ["https://www.netflix.com/tudum/top10/data/", "https://top10.netflix.com/data/"]:
        try:
            rows = list(csv.DictReader(io.StringIO(http(base + "all-weeks-countries.tsv")), delimiter="\t"))
            break
        except Exception as e:
            print("netflix fail", base, e); rows = []
    mt = [r for r in rows if r.get("country_iso2") == "MT"]
    if not mt: return None, []
    wk = max(r["week"] for r in mt)
    cur = sorted([r for r in mt if r["week"] == wk], key=lambda r: (0 if "TV" in r["category"] else 1, int(r["weekly_rank"])))
    items = []
    for r in cur:
        kind = "tv" if "TV" in r["category"] else "movie"
        show = r["show_title"].strip()
        season = (r.get("season_title") or "").strip()
        title = season if season and season.upper() != "N/A" else show
        it = {"title": title, "kind": kind, "rank": int(r["weekly_rank"]), "weeks": int(r.get("cumulative_weeks_in_top_10") or 1),
              "imdb": imdb_search(show)}
        if KEY:
            try:
                res = tmdb(f"/search/{kind}", query=show, include_adult="false").get("results") or []
                if res:
                    t = res[0]
                    if t.get("poster_path"): it["poster"] = IMG + t["poster_path"]
                    it["year"] = (t.get("first_air_date") or t.get("release_date") or "")[:4]
                    it["imdb"] = enrich(kind, t["id"]) or it["imdb"]
            except Exception as e:
                print("tmdb netflix", show, e)
        items.append(it)
    return wk, items

# ---------- Other platforms via TMDB (available in Malta, by popularity) ----------
PLATFORMS = [("hbo", "HBO Max", ["HBO Max", "Max"]), ("prime", "Prime Video", ["Amazon Prime Video", "Prime Video"]),
             ("disney", "Disney+", ["Disney Plus", "Disney+"]), ("apple", "Apple TV", ["Apple TV+", "Apple TV Plus", "Apple TV"])]

def provider_ids():
    found = {}
    for kind in ("movie", "tv"):
        for p in tmdb(f"/watch/providers/{kind}", watch_region="MT").get("results", []):
            found.setdefault(p["provider_name"], p["provider_id"])
    return found

def platform(names, provs):
    pid = next((provs[n] for n in names if n in provs), None)
    if not pid: return []
    pool = []
    for kind in ("tv", "movie"):
        res = tmdb(f"/discover/{kind}", watch_region="MT", with_watch_providers=pid, with_watch_monetization_types="flatrate",
                   sort_by="popularity.desc", include_adult="false", page=1).get("results", [])[:6]
        for t in res:
            pool.append((t.get("popularity", 0), kind, t))
    pool.sort(key=lambda x: -x[0])
    items = []
    for _, kind, t in pool[:10]:
        title = t.get("name") or t.get("title")
        items.append({"title": title, "kind": kind,
                      "year": (t.get("first_air_date") or t.get("release_date") or "")[:4],
                      "poster": IMG + t["poster_path"] if t.get("poster_path") else None,
                      "imdb": enrich(kind, t["id"]) or imdb_search(title)})
    return items

wk, nf = netflix()
out = {"updated": datetime.date.today().isoformat(), "week": wk, "tmdb": bool(KEY),
       "platforms": [{"id": "netflix", "name": "Netflix", "label": "Top 10 in Malta this week", "items": nf}]}
if KEY:
    try:
        provs = provider_ids()
        print("providers in MT:", {k: v for k, v in provs.items() if any(w in k for w in ("HBO", "Max", "Prime", "Disney", "Apple"))})
        for pid, name, names in PLATFORMS:
            try:
                items = platform(names, provs)
            except Exception as e:
                print("platform fail", name, e); items = []
            if items:
                out["platforms"].append({"id": pid, "name": name, "label": "Popular on " + name + " in Malta", "items": items})
    except Exception as e:
        print("tmdb fail", e)
else:
    print("No TMDB_KEY yet: Netflix only.")
json.dump(out, open("data/stayin.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps({p["name"]: len(p["items"]) for p in out["platforms"]}))
