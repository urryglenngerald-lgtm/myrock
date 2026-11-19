"""Downloads the official Sunday and public holiday pharmacy roster PDFs from the Malta
Medicines Authority (this year and next, when published) and rebuilds data/pharmacies.json."""
import datetime, os, re, subprocess, sys, tempfile, urllib.request

BASE = "https://medicinesauthority.gov.mt/"
UA = {"User-Agent": "Mozilla/5.0 (myRock pharmacy roster; myrockmalta.com)"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def file_link(html, phrase):
    m = re.search(phrase + r".*?href=\"([^\"]*file\.aspx\?f=\d+)\"", html, re.I | re.S)
    return m and (m.group(1) if m.group(1).startswith("http") else BASE + m.group(1).lstrip("/"))


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "data/pharmacies.json"
    year = datetime.date.today().year
    specs, tmp = [], tempfile.mkdtemp()
    for y in (year, year + 1):
        try:
            html = get(f"{BASE}roster{y}").decode("utf-8", "ignore")
        except Exception as e:
            print(f"{y}: no roster page ({e})"); continue
        areas = file_link(html, r"areas and the list of pharmacies")
        roster = file_link(html, r"whole roster for Sundays")
        if not (areas and roster):
            print(f"{y}: roster files not published yet"); continue
        a, r = os.path.join(tmp, f"areas{y}.pdf"), os.path.join(tmp, f"roster{y}.pdf")
        open(a, "wb").write(get(areas)); open(r, "wb").write(get(roster))
        print(f"{y}: {areas} + {roster}")
        specs.append(f"{y}:{a}:{r}")
    if not specs:
        sys.exit("No roster found, keeping the current file")
    here = os.path.dirname(os.path.abspath(__file__))
    subprocess.run([sys.executable, os.path.join(here, "build_pharmacies.py"), out, *specs], check=True)


if __name__ == "__main__":
    main()
