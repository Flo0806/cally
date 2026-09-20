import type { Place } from "#shared/types";

// Photon (OSM based, no key). Results are biased towards home so "Bahnhofstraße" finds ours.
const USER_AGENT = "cally/0.1 (family calendar)";
const cache = new Map<string, Place[]>();

interface Feature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
  };
}

// "Klinikum Weiden, Söllnerstraße 16, 92637 Weiden": the place name stays in front of the address
function labelOf(p: Feature["properties"]): string {
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  const town = [p.postcode, p.city].filter(Boolean).join(" ");
  const name = p.name && p.name !== p.street && p.name !== p.city ? p.name : "";
  return [name, street, town].filter(Boolean).join(", ");
}

export async function searchPlaces(
  query: string,
  home: { lat: number; lon: number } | null,
  limit = 5,
): Promise<Place[]> {
  const key = `${query}|${limit}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("lang", "de");
  if (home) {
    url.searchParams.set("lat", String(home.lat));
    url.searchParams.set("lon", String(home.lon));
  }
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`photon: HTTP ${response.status}`);
  const data = (await response.json()) as { features: Feature[] };

  const seen = new Set<string>();
  const places: Place[] = [];
  for (const feature of data.features) {
    const label = labelOf(feature.properties);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    const [lon, lat] = feature.geometry.coordinates;
    places.push({ label, lat, lon });
  }
  cache.set(key, places);
  return places;
}
