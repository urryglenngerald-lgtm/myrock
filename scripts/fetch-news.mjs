// Pulls showbiz headlines for the myRock news ticker and writes data/news.json.
// Runs on GitHub Actions twice a day. Headlines are credited and link to the original article.
import { readFile, writeFile } from "node:fs/promises";

const SOURCES = [
  { name: "Billboard", urls: ["https://www.billboard.com/feed/"] },
  { name: "E! News", urls: ["https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml", "https://www.eonline.com/news.rss"] },
  { name: "Teen Vogue", urls: ["https://www.teenvogue.com/feed/culture/rss", "https://www.teenvogue.com/feed/rss"] }
];
const PER_SOURCE = 4;
const OUT = "data/news.json";

// Keep it light: no politics, no war, no crime, no deaths.
const BLOCK = /\b(trump|biden|harris|vance|obama|election|elect|congress|senate|senator|republican|democrat|gop|white house|president|politic\w*|vote|voting|campaign|government|minister|israel|gaza|palestin\w*|ukraine|russia|putin|war|military|ice raid|immigra\w*|deport\w*|shooting|shot|killed|kill|murder|dies|died|dead|death|obituary|rip|funeral|suicide|abuse|assault|rape|sex\w*|middle east|peace|arrest\w*|charged|trial|lawsuit|sued|sues|court|prison|jail|overdose|cancer)\b/i;

// Skip industry and business stories too: Gen Z wants stars, songs and shows, not studio mergers.
const DULL = /\b(ceo|executive|exec|merger|acquire\w*|acquisition|layoffs?|stock|shares|earnings|revenue|deal|studios?|streaming royalt\w*|guest column|ratings|upfronts?|shareholders?|invest\w*|incentives?|tax\w*|polic\w*|tariffs?|black friday|cyber monday|prime day|sales?|discount\w*|coupon\w*|shop\w*|gift sets?|\d+% off)\b/i;
const DULL_LINK = /\/(pro|business|biz)\//i;

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, "")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ").trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};

export function parse(xml) {
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => ({
    title: tag(m[0], "title"),
    link: tag(m[0], "link"),
    date: Date.parse(tag(m[0], "pubDate")) || 0
  })).filter((i) => i.title && /^https:\/\//.test(i.link));
}

async function fetchSource(src) {
  for (const url of src.urls) {
    try {
      const r = await fetch(url, { headers: { "user-agent": "myRock news ticker (myrockmalta.com)" }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const items = parse(await r.text());
      if (items.length) return items;
    } catch (e) { console.log(`${src.name}: ${url} failed (${e.message})`); }
  }
  return [];
}

async function main() {
  const weekAgo = Date.now() - 7 * 864e5;
  const lists = await Promise.all(SOURCES.map(async (src) => {
    const items = (await fetchSource(src))
      .filter((i) => !BLOCK.test(i.title) && !DULL.test(i.title) && !DULL_LINK.test(i.link) && (!i.date || i.date > weekAgo) && i.title.length <= 110)
      .slice(0, PER_SOURCE);
    console.log(`${src.name}: ${items.length} headlines kept`);
    return items.map((i) => ({ text: `${i.title} (${src.name})`, link: i.link, source: src.name }));
  }));

  // Mix the sources: one from each in turn.
  const mixed = [];
  for (let k = 0; k < PER_SOURCE; k++) for (const l of lists) if (l[k]) mixed.push(l[k]);

  if (mixed.length < 3) { console.log("Too few headlines, keeping the current news.json"); return; }
  const next = JSON.stringify(mixed, null, 2) + "\n";
  const prev = await readFile(OUT, "utf8").catch(() => "");
  if (prev === next) { console.log("No change"); return; }
  await writeFile(OUT, next);
  console.log(`Wrote ${mixed.length} headlines to ${OUT}`);
}

if (process.argv[1] && process.argv[1].endsWith("fetch-news.mjs")) main();
