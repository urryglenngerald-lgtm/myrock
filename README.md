# myRock website (v1)

What's on in Malta and Gozo, at myrockmalta.com. Part of Gerald's Media House.

This is a plain website (no build step). It also installs on phones like an app ("Add to home screen").

## Files you will edit

| File | What it is |
|---|---|
| `data/events.json` | The events list. This is the one you update every week. |
| `data/news.json` | The lines in the news ticker at the top. |
| `data/knock.json` | Knock, the food billboard: the restaurants who paid to be listed. |
| `js/config.js` | Settings: advertising email, Facebook and Instagram links, Knock email. |

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

## How to add a restaurant to Knock

Knock is the food billboard (the Knock tab, the Food tile, or myrockmalta.com/#knock). Only paying restaurants go in. Open `data/knock.json` and add one block per restaurant:

```json
[
  {
    "id": "restaurant-name",
    "name": "Restaurant Name",
    "cuisine": "Burgers",
    "town": "Sliema",
    "deal": "2 for 1 every Tuesday",
    "hours": "12:00 to 23:00",
    "image": "images/knock/restaurant-name.jpg",
    "menu": "https://their-menu-page",
    "order": "https://their-ordering-page",
    "whatsapp": "35699123456",
    "phone": "+35621234567",
    "address": "Street, Town",
    "plan": "top",
    "from": "2026-12-15",
    "until": "2027-01-14"
  }
]
```

Rules:

- Only `name` is required. Buttons (Menu, Order, WhatsApp, Call, Map) appear only for what you fill in.
- `image`: the restaurant's own poster or menu photo, saved in `images/knock/`.
- `plan`: `"top"` = Top spot (yellow card, glowing, always first). Leave it out for a standard listing.
- `from` / `until`: the paid dates. The listing appears and disappears by itself, so an unpaid month never stays up.
- `cuisine`: the filter chips are built from this, so keep the spelling the same (Burgers, Pizza, Maltese, Asian...).
- WhatsApp messages arrive saying "Saw you on Knock (myRock)", so the restaurant can see where customers came from.
- Add `?demo=1` to the address to preview sample cards while the file is empty.

## Sample preview

While `data/events.json` is empty, add `?demo=1` to the address to see the app filled with clearly labelled sample cards (they are not real events).

## Weather

Live weather comes from Open-Meteo (free for non-commercial use, data under CC BY 4.0, credited in the footer). Before myRock starts earning money from ads, switch to Open-Meteo's paid plan or another provider with a commercial licence.
