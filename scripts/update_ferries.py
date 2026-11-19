"""Builds data/ferries.json for the next 14 days from the operators' own data:
- Gozo Channel (car ferry, Ċirkewwa ⇄ Mġarr): the daily JSON files their website loads.
- Gozo Highspeed (fast ferry, Valletta / Sliema / Buġibba ⇄ Mġarr): the timetable built into their website.
No dependencies, runs on GitHub Actions."""
import datetime, json, re, sys, urllib.request
from zoneinfo import ZoneInfo

UA = {"User-Agent": "Mozilla/5.0 (myRock ferry times; myrockmalta.com)"}
DAYS = 14


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
        return r.read().decode("utf-8", "ignore")


# ---------- Gozo Channel ----------
def gozo_channel(day):
    url = f"https://static.gozochannel.com/schedules/{day:%Y/%m/%d}/passenger.json"
    j = json.loads(get(url))
    times = j.get("times") or {}
    pick = lambda key: [t["name"] for t in times.get(key) or [] if re.fullmatch(r"\d\d:\d\d", t.get("name", ""))]
    mgarr = pick("mgarr")
    cirk = pick("cirkewwa") or pick(next((k for k in times if k != "mgarr"), ""))
    if not mgarr or not cirk:
        raise ValueError(f"Gozo Channel {day}: empty schedule")
    return {"fromCirkewwa": cirk, "fromMgarr": mgarr, "holiday": bool(j.get("is_holiday"))}


# ---------- Gozo Highspeed ----------
def highspeed_tables():
    home = get("https://gozohighspeed.com/")
    js = re.search(r'src="(/assets/index-[^"]+\.js)"', home)
    if not js:
        raise ValueError("Gozo Highspeed: app script not found")
    b = get("https://gozohighspeed.com" + js.group(1))
    notes_m = re.search(r'(\w+)=\[\{id:"schedule-note-1".*?\}\]', b, re.S)
    notes_var = notes_m.group(1)
    notes = re.findall(r'accessibleNote:"([^"]+)"', notes_m.group(0))
    arrays = {}
    for m in re.finditer(r'[,;\s](\w{2,5})=(\[\{d:".*?\}\])', b):
        name, body = m.group(1), m.group(2)
        trips = []
        for t in re.finditer(r'\{d:"(\d\d:\d\d)",a:"(\d\d:\d\d)"(?:,note:' + re.escape(notes_var) + r'\[(\d)\])?\}', body):
            trips.append({"d": t.group(1), "a": t.group(2), "note": notes[int(t.group(3))] if t.group(3) else None})
        arrays[name] = trips
    tables = {}
    for m in re.finditer(r'columns:\[\{from:"(\w+)",to:"(\w+)",times:(\w+)\},\{from:"(\w+)",to:"(\w+)",times:(\w+)\}\]', b):
        for f, t, v in ((m.group(1), m.group(2), m.group(3)), (m.group(4), m.group(5), m.group(6))):
            tables[(f, t)] = arrays[v]
    need = [("Valletta", "Gozo"), ("Gozo", "Valletta"), ("Sliema", "Bugibba"), ("Bugibba", "Gozo"), ("Gozo", "Bugibba"), ("Bugibba", "Sliema")]
    missing = [k for k in need if k not in tables]
    if missing:
        raise ValueError(f"Gozo Highspeed: missing tables {missing}")
    return tables, notes


def runs(note, day):
    """Apply the operator's own footnotes to a date."""
    if not note:
        return True
    summer = 4 <= day.month <= 10
    weekend = day.weekday() >= 4  # Fri, Sat, Sun
    n = note.lower()
    known = {
        "1st april to 31st october - daily": summer,
        "1st november to 31st march - daily": not summer,
        "1st april to 31st october - friday, saturday & sunday": summer and weekend,
        "1st april to 31st october - daily. 1st nov to 31st march - friday, saturday and sunday": summer or weekend,
    }
    if n in known:
        return known[n]
    raise ValueError(f"Unknown timetable note: {note!r}")


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "data/ferries.json"
    today = datetime.datetime.now(ZoneInfo("Europe/Malta")).date()
    tables, notes = highspeed_tables()
    hs = lambda f, t, day: [x for x in tables[(f, t)] if runs(x["note"], day)]
    days = []
    for i in range(DAYS):
        day = today + datetime.timedelta(days=i)
        gc = gozo_channel(day)
        to_sl, sl_to = [], []
        a, b = tables[("Sliema", "Bugibba")], tables[("Bugibba", "Gozo")]
        for x, y in zip(a, b):  # same voyage: Sliema, then Buġibba, then Mġarr
            if runs(x["note"] or y["note"], day):
                to_sl.append({"sliema": x["d"], "bugibba": y["d"], "gozo": y["a"]})
        a, b = tables[("Gozo", "Bugibba")], tables[("Bugibba", "Sliema")]
        for x, y in zip(a, b):
            if runs(x["note"] or y["note"], day):
                sl_to.append({"gozo": x["d"], "bugibba": x["a"], "sliema": y["a"]})
        days.append({
            "date": day.isoformat(),
            "holiday": gc["holiday"],
            "toGozo": {
                "cirkewwa": gc["fromCirkewwa"],
                "valletta": [{"d": x["d"], "a": x["a"]} for x in hs("Valletta", "Gozo", day)],
                "sliema": to_sl,
            },
            "toMalta": {
                "mgarr": gc["fromMgarr"],
                "valletta": [{"d": x["d"], "a": x["a"]} for x in hs("Gozo", "Valletta", day)],
                "sliema": sl_to,
            },
        })
    data = {
        "updated": datetime.datetime.now(ZoneInfo("Europe/Malta")).strftime("%Y-%m-%d %H:%M"),
        "sources": {"gozoChannel": "https://www.gozochannel.com/ferry/schedule/", "highspeed": "https://gozohighspeed.com/"},
        "days": days,
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Wrote {len(days)} days to {out}; first day: GC {len(days[0]['toGozo']['cirkewwa'])}/{len(days[0]['toMalta']['mgarr'])} trips, "
          f"Valletta {len(days[0]['toGozo']['valletta'])}/{len(days[0]['toMalta']['valletta'])}, Sliema {len(days[0]['toGozo']['sliema'])}/{len(days[0]['toMalta']['sliema'])}")


if __name__ == "__main__":
    main()
