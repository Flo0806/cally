import { createError, defineEventHandler, setResponseHeader } from "nuxt/server";
import { requireParam } from "../../utils/validate";

// Favicons proxied and cached here, so the tablet never talks to a third party for an icon
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const HOST_RE = /^[a-z0-9.-]+$/i;

interface Icon {
  at: number;
  type: string;
  body: ArrayBuffer | null;
}

const cache = new Map<string, Icon>();

async function fetchIcon(host: string): Promise<Icon> {
  const response = await fetch(`https://icons.duckduckgo.com/ip3/${host}.ico`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return { at: Date.now(), type: "", body: null };
  return {
    at: Date.now(),
    type: response.headers.get("content-type") ?? "image/x-icon",
    body: await response.arrayBuffer(),
  };
}

export default defineEventHandler(async (event) => {
  const host = requireParam(event, "host").toLowerCase();
  if (!HOST_RE.test(host)) throw createError({ statusCode: 400, message: "Ungültiger Host" });

  let icon = cache.get(host);
  if (!icon || Date.now() - icon.at > CACHE_TTL_MS) {
    icon = await fetchIcon(host);
    cache.set(host, icon);
  }
  if (!icon.body) throw createError({ statusCode: 404, message: "Kein Icon" });

  setResponseHeader(event, "content-type", icon.type);
  setResponseHeader(event, "cache-control", "public, max-age=86400");
  return icon.body;
});
