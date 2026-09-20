import { useRuntimeConfig } from "nitro/runtime-config";

// Home is where the weather is configured for
export function homeCoords(): { lat: number; lon: number } | null {
  const { latitude, longitude } = useRuntimeConfig().weather;
  const lat = Number(latitude);
  const lon = Number(longitude);
  return latitude && longitude && !Number.isNaN(lat) && !Number.isNaN(lon) ? { lat, lon } : null;
}
