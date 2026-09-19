import { XMLParser } from "fast-xml-parser";
import { Temporal } from "temporal-polyfill";
import type { News, NewsCategory, NewsItem } from "#shared/types";
import { NEWS_CATEGORIES, type NewsSource } from "./sources";

const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const ITEMS_PER_CATEGORY = 30;
const SUMMARY_LENGTH = 280;
const USER_AGENT = "cally/0.1 (family calendar, RSS reader)";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

type Raw = Record<string, unknown>;

// Stable id from the link. Not cryptographic, only needs to be unique enough for favorites.
function hashId(value: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x811c9dc5) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const raw = value as Raw;
    return text(raw["#text"] ?? raw["@_href"] ?? "");
  }
  return String(value);
}

// Feed bodies carry HTML in CDATA, keep the words only
function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(value: string): string {
  return value.length > SUMMARY_LENGTH ? `${value.slice(0, SUMMARY_LENGTH - 1).trimEnd()}…` : value;
}

// RFC 822 dates from RSS have no Temporal parser, Date does the parsing only
function toInstant(value: string): string | null {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : Temporal.Instant.fromEpochMilliseconds(ms).toString();
}

function atomLink(entry: Raw): string {
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];
  const alternate = links.find(
    (l) => (l as Raw)?.["@_rel"] === "alternate" || !(l as Raw)?.["@_rel"],
  );
  return text(alternate ?? links[0]);
}

function parseFeed(xml: string, source: NewsSource): NewsItem[] {
  const doc = parser.parse(xml) as Raw;
  const channel = (doc.rss as Raw)?.channel as Raw | undefined;
  const feed = doc.feed as Raw | undefined;

  const entries = channel
    ? ([] as Raw[]).concat((channel.item as Raw[]) ?? [])
    : feed
      ? ([] as Raw[]).concat((feed.entry as Raw[]) ?? [])
      : [];

  const items: NewsItem[] = [];
  for (const entry of entries) {
    const link = channel ? text(entry.link) : atomLink(entry);
    // Aggregators (Google News) name the outlet in <source> and append it to the title
    const outlet = plain(text(entry.source));
    const rawTitle = plain(text(entry.title));
    const title =
      outlet && rawTitle.endsWith(` - ${outlet}`)
        ? rawTitle.slice(0, -(outlet.length + 3)).trimEnd()
        : rawTitle;
    const published = toInstant(
      text(entry.pubDate ?? entry.published ?? entry.updated ?? entry["dc:date"]),
    );
    if (!link || !title || !published) continue;
    items.push({
      id: hashId(link),
      title,
      link,
      summary: clip(plain(text(entry.description ?? entry.summary ?? entry.content ?? ""))),
      source: outlet || source.name,
      published,
    });
  }
  return items;
}

// Not every feed is UTF-8 (Golem is ISO-8859-1), honour the declared charset
function decode(body: ArrayBuffer, contentType: string | null): string {
  const head = new TextDecoder("latin1").decode(body.slice(0, 200));
  const declared =
    /encoding=["']([^"']+)["']/i.exec(head)?.[1] ??
    /charset=["']?([^"';\s]+)/i.exec(contentType ?? "")?.[1];
  try {
    return new TextDecoder(declared ?? "utf-8").decode(body);
  } catch {
    return new TextDecoder().decode(body);
  }
}

async function fetchSource(source: NewsSource): Promise<NewsItem[]> {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
  return parseFeed(
    decode(await response.arrayBuffer(), response.headers.get("content-type")),
    source,
  );
}

async function fetchCategory(def: (typeof NEWS_CATEGORIES)[number]): Promise<NewsCategory> {
  const results = await Promise.allSettled(def.sources.map(fetchSource));
  // Cap per source first: some feeds stamp every item with the fetch time and would
  // otherwise push the other sources out of the category entirely
  const perSource = Math.ceil(ITEMS_PER_CATEGORY / def.sources.length);
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "rejected") {
      console.warn(`[news] ${def.id}: ${String(result.reason)}`);
      continue;
    }
    let taken = 0;
    for (const item of result.value) {
      if (taken >= perSource || seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
      taken++;
    }
  }
  // Stable sort: ties keep feed order, which is the only order some feeds have
  items.sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0));
  return { id: def.id, label: def.label, items: items.slice(0, ITEMS_PER_CATEGORY) };
}

async function fetchAll(): Promise<News> {
  const categories = await Promise.all(NEWS_CATEGORIES.map(fetchCategory));
  const ids = categories.flatMap((c) => c.items.map((i) => i.id)).sort();
  return { fetchedAt: Temporal.Now.instant().toString(), digest: hashId(ids.join()), categories };
}

// Stale while revalidate: a stale cache is served at once and refreshed in the background,
// so the tablet never waits on a dozen feeds
let cache: { at: number; data: News } | null = null;
let refreshing: Promise<News> | null = null;

// Forced refresh for the scheduled pull, callers waiting on getNews() share the same run
export function refreshNews(): Promise<News> {
  refreshing ??= fetchAll()
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export function getNewsStatus(): { fetchedAt: string; digest: string } | null {
  return cache ? { fetchedAt: cache.data.fetchedAt, digest: cache.data.digest } : null;
}

export async function getNews(): Promise<News> {
  const fresh = cache && Date.now() - cache.at < CACHE_TTL_MS;
  if (cache && fresh) return cache.data;

  const run = refreshNews();
  if (cache) {
    run.catch((error) => console.warn(`[news] refresh failed: ${String(error)}`));
    return cache.data;
  }
  return run;
}
