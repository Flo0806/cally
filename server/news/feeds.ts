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

// Named entities that show up in German feeds, numeric ones are decoded generically
const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  bdquo: "„",
  ldquo: "“",
  rdquo: "”",
  euro: "€",
};

// Feed bodies carry HTML in CDATA, keep the words only
function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name] ?? match)
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

const IMAGE_URL_RE = /^https?:\/\/.+\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i;

function isImage(node: Raw | undefined): boolean {
  if (!node) return false;
  const type = String(node["@_type"] ?? node["@_medium"] ?? "");
  const url = String(node["@_url"] ?? "");
  return type.startsWith("image") || IMAGE_URL_RE.test(url);
}

// Enclosure, then Media RSS, then the first <img> in the HTML body. Half the feeds have one.
function imageOf(entry: Raw): string | null {
  const nodes = (value: unknown) => ([] as unknown[]).concat(value ?? []) as Raw[];
  // Thumbnails are images by definition, the others have to say so
  const media = [
    ...nodes(entry["media:thumbnail"]).filter((node) => node?.["@_url"]),
    ...nodes(entry.enclosure).filter((node) => node?.["@_url"] && isImage(node)),
    ...nodes(entry["media:content"]).filter((node) => node?.["@_url"] && isImage(node)),
  ][0];
  if (media) return String(media["@_url"]);
  const html = text(
    entry["content:encoded"] ?? entry.description ?? entry.summary ?? entry.content ?? "",
  );
  const src = /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1];
  return src && /^https?:\/\//.test(src) ? src : null;
}

function atomLink(entry: Raw): string {
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];
  const alternate = links.find(
    (l) => (l as Raw)?.["@_rel"] === "alternate" || !(l as Raw)?.["@_rel"],
  );
  return text(alternate ?? links[0]);
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function parseFeed(xml: string, source: NewsSource): NewsItem[] {
  const doc = parser.parse(xml) as Raw;
  const channel = (doc.rss as Raw)?.channel as Raw | undefined;
  const feed = doc.feed as Raw | undefined;
  const feedSite = originOf(text(channel?.link ?? (feed ? atomLink(feed) : "")) || source.url);

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
      image: imageOf(entry),
      sourceUrl: originOf(String((entry.source as Raw)?.["@_url"] ?? "")) || feedSite,
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
