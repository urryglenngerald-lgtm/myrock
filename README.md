# myRock website (v1)

What's on in Malta and Gozo, at myrockmalta.com. Part of Gerald's Media House.

This is a plain website (no build step). It also installs on phones like an app ("Add to home screen").

## Files you will edit

| File | What it is |
|---|---|
| `data/events.json` | The events list. This is the one you update every week. |
| `data/news.json` | The lines in the news ticker at the top. |
| `js/config.js` | Settings: advertising email, Facebook and Instagram links, Knock link. |

Everything else is the app itself. Leave it alone unless we are changing the design.

## How to add an event

Open `data/events.json` and add one block per event, separated by commas, inside the `[ ]`:

```json
[
  {
    "id": "jazz-valletta-2026-11-21",
    "title": "Jazz on the Bastions",
    "category": "Live music",
    "date": "2026-11-21",
    "time": "20:00",
    "venue": "Venue name",
    "town": "Valletta",
    "image": "images/jazz-valletta.jpg",
    "link": "https://the-organiser's-official-page",
    "price": "Free entry",
    "featured": true
  }
]
```

Rules:

- `id`: unique, no spaces. Event name plus date works well.
- `date`: always `YYYY-MM-DD`. For events over several days, also add `"endDate": "YYYY-MM-DD"`.
- `link`: the organiser's official page or ticket page, so people can check the details.
- `image`: put the promoter's image (with their permission) in the `images` folder and write its path here. Optional.
- `featured`: `true` puts it in the big billboard at the top. Paid featured spots go here.
- `category`, `time`, `venue`, `town`, `price` are optional but make the card look complete.
- Never add an event that hasn't been checked against the organiser's own page.

Past events disappear automatically the day after they end.

## Sample preview

While `data/events.json` is empty, add `?demo=1` to the address to see the app filled with clearly labelled sample cards (they are not real events).

## Weather

Live weather comes from Open-Meteo (free for non-commercial use, data under CC BY 4.0, credited in the footer). Before myRock starts earning money from ads, switch to Open-Meteo's paid plan or another provider with a commercial licence.
