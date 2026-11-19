"""Builds data/pharmacies.json from the Malta Medicines Authority's official Sunday and
public holiday roster PDFs (one 'areas' PDF listing every pharmacy per area, one 'roster'
PDF with a grid of dates x areas holding the pharmacy number on duty).

Usage: python3 build_pharmacies.py OUT.json YEAR:AREAS.pdf:ROSTER.pdf [YEAR:AREAS.pdf:ROSTER.pdf ...]
"""
import json, re, sys
import pdfplumber

TOWNS = ["Swatar", "Fleur De Lys", "St Paul's Bay", "Ta' Xbiex", "San Gwann", "St Julian", "St Lucija", "Smart City",
         "Santa Venera", "Pieta'", "Valletta", "Floriana", "Hamrun", "Marsa", "Qormi", "Zebbug", "Żebbuġ",
         "Birkirkara", "Mrieħel", "Gzira", "Pembroke", "Swieqi", "Sliema", "Naxxar", "Gharghur", "Iklin", "Lija",
         "Mosta", "Attard", "Balzan", "Mgarr", "Mellieha", "Burmarrad", "Paola", "Tarxien", "Luqa", "Fgura",
         "Isla", "Bormla", "Birgu", "Kalkara", "Zabbar", "Marsaskala", "Xaghjra", "Zejtun", "Żejtun",
         "Birżebbuġa", "Ghaxaq", "Marsaxlokk", "Zurrieq", "Mqabba", "Kirkop", "Qrendi", "Gudja", "Safi", "Msida",
         "Rabat", "Mtarfa", "Siġġiewi", "Dingli", "Baħrjia", "Marsalforn", "Kercem", "Gharb", "Għajnsielem",
         "Xagħra", "Nadur", "Sannat", "Qala", "Xewkija"]
NICE = {"Hamrun": "Ħamrun", "Zebbug": "Żebbuġ", "Gzira": "Gżira", "San Gwann": "San Ġwann", "St Julian": "St Julian's",
        "Gharghur": "Għargħur", "Mgarr": "Mġarr", "Mellieha": "Mellieħa", "St Lucija": "Santa Luċija",
        "Zabbar": "Żabbar", "Xaghjra": "Xgħajra", "Zejtun": "Żejtun", "Ghaxaq": "Għaxaq", "Zurrieq": "Żurrieq",
        "Pieta'": "Pietà", "Baħrjia": "Baħrija", "Kercem": "Kerċem (Gozo)", "Gharb": "Għarb (Gozo)",
        "Fleur De Lys": "Fleur-de-Lys", "Marsalforn": "Marsalforn (Gozo)", "Għajnsielem": "Għajnsielem (Gozo)",
        "Xagħra": "Xagħra (Gozo)", "Nadur": "Nadur (Gozo)", "Sannat": "Sannat (Gozo)", "Qala": "Qala (Gozo)",
        "Xewkija": "Xewkija (Gozo)"}
FIX = {"Brown's Naxxar Centre PharmaNcyaxxar": "Brown's Naxxar Centre Pharmacy Naxxar"}


def parse_areas(path):
    areas = {}
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    for cell in row:
                        if not cell or not cell.strip().startswith("Area"):
                            continue
                        lines = [l.strip() for l in cell.split("\n") if l.strip()]
                        m = re.match(r"Area (\d+)\s*-\s*(.+)", lines[0])
                        num = int(m.group(1))
                        gozo = num >= 18
                        pharmacies = {}
                        for line in lines[1:]:
                            line = FIX.get(re.sub(r"^\d+\.\s*", "", line), None) and (line.split(".")[0] + ". " + FIX[re.sub(r"^\d+\.\s*", "", line)]) or line
                            pm = re.match(r"(\d+)\.\s*(.+)", line)
                            if not pm:
                                continue
                            idx, rest = int(pm.group(1)), pm.group(2).strip()
                            town = next((t for t in sorted(TOWNS, key=len, reverse=True) if rest.endswith(" " + t)), None)
                            if town:
                                name = rest[: -len(town)].strip().rstrip(",")
                            else:
                                # Unknown town: split after the last "Pharmacy/Dispensary/Chemist", else take the last word.
                                km = list(re.finditer(r"(Pharmacy|Dispensary|Chemists?)\b", rest))
                                if km and km[-1].end() < len(rest):
                                    name, town = rest[: km[-1].end()].strip(), rest[km[-1].end():].strip()
                                else:
                                    name, town = rest.rsplit(" ", 1)
                                print(f"  check: area {num} #{idx}: {name!r} / {town!r}")
                            nice = NICE.get(town, town)
                            if town == "Rabat":
                                nice = "Victoria (Gozo)" if gozo else "Rabat"
                            pharmacies[idx] = {"name": name, "town": nice}
                        areas[num] = {"label": m.group(2).replace(" - ", ", "), "pharmacies": pharmacies}
    return areas


def parse_roster(path, year):
    dates_by_area = {}
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                header = table[0]
                rows = table[1:]
                offset = 2 if (rows[0][0] or "").startswith("Area") else 0
                dates = []
                for h in header[offset:]:
                    s = (h or "").replace("\n", "")
                    d = re.search(r"(\d\d)/(\d\d)/(\d{4})", s)
                    if not d:
                        r = re.search(r"\d{4}/\d\d/\d\d", s)  # rotated header text comes out reversed
                        d = r and re.fullmatch(r"(\d\d)/(\d\d)/(\d{4})", r.group(0)[::-1])
                    if not d:
                        raise ValueError(f"Bad date header {h!r}")
                    dates.append(f"{d.group(3)}-{d.group(2)}-{d.group(1)}")
                for i, row in enumerate(rows, start=1):
                    for date, cell in zip(dates, row[offset:]):
                        cell = (cell or "").strip()
                        if cell:
                            dates_by_area.setdefault(date, {})[i] = int(cell)
    return dates_by_area


def main():
    out, specs = sys.argv[1], sys.argv[2:]
    days = {}
    for spec in specs:
        year, areas_pdf, roster_pdf = spec.split(":")
        areas = parse_areas(areas_pdf)
        grid = parse_roster(roster_pdf, year)
        if len(areas) != 19:
            raise ValueError(f"{year}: expected 19 areas, got {len(areas)}")
        for date, by_area in sorted(grid.items()):
            entries = []
            for area_num, idx in sorted(by_area.items()):
                ph = areas[area_num]["pharmacies"].get(idx)
                if not ph:
                    raise ValueError(f"{date}: area {area_num} has no pharmacy number {idx}")
                entries.append({"area": area_num, "areaName": areas[area_num]["label"], "name": ph["name"], "town": ph["town"]})
            days[date] = entries
    data = {
        "source": "Malta Medicines Authority, Sunday and Public Holiday Pharmacy Roster",
        "sourceUrl": "https://medicinesauthority.gov.mt/pharmacyroster",
        "hours": "9am to 12pm and 4pm to 7pm",
        "days": [{"date": d, "pharmacies": days[d]} for d in sorted(days)],
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Wrote {len(days)} days to {out}")


if __name__ == "__main__":
    main()
