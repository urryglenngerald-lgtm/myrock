# How to add events to myRock (for Max and Emma)

Events live in `data/events.json` (one list). Posters live in `images/posters/`.

## The workflow

1. **Max** finds the event and checks it on the organiser's own page or ticket page.
2. **Emma** adds it as a change request (pull request) on a new branch: the event in `data/events.json` and its poster in `images/posters/`. Never push straight to `main`.
3. The **Events gate** checks it automatically. Emma's tool runs the same rules before opening the change request, so most problems come back to her straight away. If the gate still fails, fix it and send a replacement (in Blackbots: `myrock_propose` with `replaces`).
4. **Glenn** approves (merges) the change request. Once merged, the site updates within a minute or two.

One change request per batch (for example, the week's events) is best.

## House rules (the gate enforces these)

- **No official poster, no listing.** Every event needs the organiser's own poster or flyer, saved in `images/posters/`, with `"poster": true` and the organiser's name in `posterBy`.
- **Never invent anything.** Title, date, time, venue and price must match the organiser's page. If something is not published, leave it out (an empty `time` or `price` is fine).
- **No past events.** A new or changed event must not already be over.
- **No duplicates.** One event, one entry. A run of dates uses `date` (first day) and `endDate` (last day).
- **Nothing political.**

## Fields

```json
{
  "id": "ts-rock-series-brikkuni-2026-11-29",
  "title": "TS Rock Series: Brikkuni",
  "category": "Live music",
  "date": "2026-11-29",
  "endDate": "",
  "time": "20:00",
  "venue": "Teatru Salesjan",
  "town": "Sliema",
  "price": "€15",
  "link": "https://organiser-or-ticket-page",
  "image": "images/posters/ts-rock-series-brikkuni-2026-11-29.jpg",
  "poster": true,
  "posterBy": "Teatru Salesjan",
  "featured": false
}
```

- `id`: lowercase words and dashes, ending with the date. Must be unique. The poster file uses the same name.
- `category`: short, e.g. Live music, Techno, Rock, Metal, Classical, Candlelight, Christmas, Festa, Comedy, Theatre, Panto, Food, Sport, NYE.
- `date`, `endDate`: `YYYY-MM-DD`. Leave `endDate` empty for one-day events.
- `time`: `HH:MM`, 24 hours, Malta time.
- `link`: must start with `https://`.
- `featured`: `true` only for paid Featured events (€20). Never set it for free.
- Poster: JPG, PNG or WebP, under 1.5 MB. About 1000 px on the long side is plenty.
