import { useRuntimeConfig } from "nitro/runtime-config";
import type { RouteIncident } from "#shared/types";
import type { LatLon } from "./tomtom";

// TomTom traffic incidents inside the route's bounding box, kept only where they touch the
// route. Knows country roads too, which the federal Autobahn feed does not.
const CACHE_TTL_MS = 10 * 60 * 1000;
const NEAR_METERS = 60;
const MAX_INCIDENTS = 5;

// TomTom iconCategory
const KINDS: Record<number, { kind: string; severity: RouteIncident["severity"] }> = {
  1: { kind: "Unfall", severity: "warning" },
  2: { kind: "Nebel", severity: "info" },
  3: { kind: "Gefahrenstelle", severity: "warning" },
  4: { kind: "Regen", severity: "info" },
  5: { kind: "Glätte", severity: "warning" },
  6: { kind: "Stau", severity: "warning" },
  7: { kind: "Spur gesperrt", severity: "info" },
  8: { kind: "Sperrung", severity: "closure" },
  9: { kind: "Baustelle", severity: "info" },
  10: { kind: "Wind", severity: "info" },
  11: { kind: "Überflutung", severity: "warning" },
  14: { kind: "Panne", severity: "info" },
};

interface Incident {
  geometry: { type: "Point" | "LineString"; coordinates: number[] | number[][] };
  properties: {
    iconCategory: number;
    events?: { description: string }[];
    from?: string;
    to?: string;
    delay?: number | null;
    roadNumbers?: string[];
  };
}

const cache = new Map<string, { at: number; incidents: RouteIncident[] }>();

// Good enough at this scale: equirectangular projection to metres around the route
function project(p: LatLon, refLat: number): { x: number; y: number } {
  const k = (Math.PI / 180) * 6371000;
  return { x: p.lon * k * Math.cos(refLat * (Math.PI / 180)), y: p.lat * k };
}

// Distance from a point to a segment, all in metres
function toSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

function coordsOf(incident: Incident): LatLon[] {
  const { type, coordinates } = incident.geometry;
  const list = type === "Point" ? [coordinates as number[]] : (coordinates as number[][]);
  return list.map(([lon, lat]) => ({ lat: lat!, lon: lon! }));
}

function touchesRoute(incident: Incident, route: { x: number; y: number }[]): boolean {
  return coordsOf(incident).some((c) => {
    const p = projectCached(c);
    for (let i = 1; i < route.length; i++) {
      if (toSegment(p, route[i - 1]!, route[i]!) <= NEAR_METERS) return true;
    }
    return false;
  });
}

let projectRefLat = 0;
function projectCached(p: LatLon) {
  return project(p, projectRefLat);
}

export async function incidentsAlong(route: LatLon[]): Promise<RouteIncident[]> {
  const key = useRuntimeConfig().tomtomKey;
  if (!key || route.length < 2) return [];

  const lats = route.map((p) => p.lat);
  const lons = route.map((p) => p.lon);
  const pad = 0.01;
  const bbox = [
    Math.min(...lons) - pad,
    Math.min(...lats) - pad,
    Math.max(...lons) + pad,
    Math.max(...lats) + pad,
  ].map((n) => n.toFixed(3));
  const cacheKey = bbox.join(",") + `|${route[0]!.lat},${route[route.length - 1]!.lat}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.incidents;

  const url = new URL("https://api.tomtom.com/traffic/services/5/incidentDetails");
  url.searchParams.set("key", key);
  url.searchParams.set("bbox", bbox.join(","));
  url.searchParams.set("language", "de-DE");
  url.searchParams.set("timeValidityFilter", "present");
  url.searchParams.set(
    "fields",
    "{incidents{type,geometry{type,coordinates},properties{iconCategory,events{description},from,to,delay,roadNumbers}}}",
  );
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`tomtom incidents: HTTP ${response.status}`);
  const data = (await response.json()) as { incidents?: Incident[] };

  projectRefLat = route[0]!.lat;
  const projected = route.map((p) => project(p, projectRefLat));

  // Both directions of a closure are reported separately, one is enough
  const seen = new Set<string>();
  const order: RouteIncident["severity"][] = ["closure", "warning", "info"];
  const incidents = (data.incidents ?? [])
    .filter(
      (incident) => KINDS[incident.properties.iconCategory] && touchesRoute(incident, projected),
    )
    .filter((incident) => {
      const p = incident.properties;
      const key = `${p.iconCategory}|${[p.from ?? "", p.to ?? ""].sort().join("|")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((incident): RouteIncident => {
      const { kind, severity } = KINDS[incident.properties.iconCategory]!;
      const p = incident.properties;
      return {
        kind,
        severity,
        road: p.roadNumbers?.[0] ?? null,
        from: p.from ?? null,
        to: p.to ?? null,
        description: p.events?.[0]?.description ?? kind,
        delayMinutes: p.delay ? Math.round(p.delay / 60) : null,
      };
    })
    .sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
    .slice(0, MAX_INCIDENTS);

  cache.set(cacheKey, { at: Date.now(), incidents });
  return incidents;
}
