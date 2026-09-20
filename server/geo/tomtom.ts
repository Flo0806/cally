import { Temporal } from "temporal-polyfill";
import { useRuntimeConfig } from "nitro/runtime-config";
import { TIME_ZONE, toDateTimeString } from "#shared/dates";

// TomTom Routing with traffic. `arriveAt` uses traffic patterns for that time of day and
// returns when to leave; without it the answer reflects the road right now.
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface LatLon {
  lat: number;
  lon: number;
}

export interface TrafficRoute {
  minutes: number;
  delayMinutes: number;
  // Local wall clock, only with arriveAt
  departAt: string | null;
  // Route geometry, capped, to match incidents against
  points: LatLon[];
}

interface Summary {
  travelTimeInSeconds: number;
  trafficDelayInSeconds: number;
  departureTime?: string;
}

const MAX_POINTS = 600;

const cache = new Map<string, { at: number; route: TrafficRoute }>();

export function hasTomTom(): boolean {
  return !!useRuntimeConfig().tomtomKey;
}

export async function trafficRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  arriveAt: string | null,
): Promise<TrafficRoute | null> {
  const key = useRuntimeConfig().tomtomKey;
  if (!key) return null;

  const cacheKey = `${from.lat},${from.lon}>${to.lat},${to.lon}@${arriveAt ?? "now"}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.route;

  const url = new URL(
    `https://api.tomtom.com/routing/1/calculateRoute/${from.lat},${from.lon}:${to.lat},${to.lon}/json`,
  );
  url.searchParams.set("key", key);
  url.searchParams.set("traffic", "true");
  url.searchParams.set("travelMode", "car");
  if (arriveAt) {
    const zoned = Temporal.PlainDateTime.from(arriveAt).toZonedDateTime(TIME_ZONE);
    url.searchParams.set(
      "arriveAt",
      zoned.toString({ timeZoneName: "never", smallestUnit: "second" }),
    );
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`tomtom: HTTP ${response.status}`);
  const data = (await response.json()) as {
    routes?: { summary: Summary; legs: { points: { latitude: number; longitude: number }[] }[] }[];
  };
  const summary = data.routes?.[0]?.summary;
  if (!summary) return null;
  const raw = data.routes?.[0]?.legs.flatMap((leg) => leg.points) ?? [];
  const step = Math.max(1, Math.ceil(raw.length / MAX_POINTS));
  const points = raw
    .filter((_, i) => i % step === 0 || i === raw.length - 1)
    .map((p) => ({ lat: p.latitude, lon: p.longitude }));

  const route: TrafficRoute = {
    points,
    minutes: Math.round(summary.travelTimeInSeconds / 60),
    delayMinutes: Math.round(summary.trafficDelayInSeconds / 60),
    departAt: summary.departureTime
      ? toDateTimeString(
          Temporal.Instant.from(summary.departureTime)
            .toZonedDateTimeISO(TIME_ZONE)
            .toPlainDateTime(),
        )
      : null,
  };
  cache.set(cacheKey, { at: Date.now(), route });
  return route;
}
