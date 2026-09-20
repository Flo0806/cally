import { Temporal } from "temporal-polyfill";
import type { SpotWeather } from "#shared/types";
import { TIME_ZONE } from "#shared/dates";

// Hourly forecast for a place, two days ahead, cached per coordinates
const CACHE_TTL_MS = 15 * 60 * 1000;

interface Hourly {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
  precipitation_probability: number[];
}

const cache = new Map<string, { at: number; hourly: Hourly }>();

async function hourlyFor(lat: number, lon: number): Promise<Hourly> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.hourly;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("hourly", "temperature_2m,weather_code,precipitation_probability");
  url.searchParams.set("timezone", TIME_ZONE);
  url.searchParams.set("forecast_days", "2");
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`open-meteo: HTTP ${response.status}`);
  const data = (await response.json()) as { hourly: Hourly };
  cache.set(key, { at: Date.now(), hourly: data.hourly });
  return data.hourly;
}

// Weather at the hour of `dateTime` (local wall clock), null when outside the forecast
export async function weatherAt(
  lat: number,
  lon: number,
  dateTime: string,
): Promise<SpotWeather | null> {
  const hourly = await hourlyFor(lat, lon);
  const hour = Temporal.PlainDateTime.from(dateTime).round({ smallestUnit: "hour" });
  const index = hourly.time.indexOf(hour.toString({ smallestUnit: "minute" }));
  if (index === -1) return null;
  return {
    temp: Math.round(hourly.temperature_2m[index]!),
    code: hourly.weather_code[index]!,
    rain: hourly.precipitation_probability[index]!,
  };
}
