import { createError, defineEventHandler, useRuntimeConfig } from "nuxt/server";
import { $fetch } from "ofetch";
import type { Weather } from "#shared/types";

const CACHE_TTL_MS = 15 * 60 * 1000;
const FORECAST_DAYS = 5;

interface OpenMeteoResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

// Open-Meteo refreshes every 15 minutes, so one in-memory copy per process is enough.
let cache: { at: number; data: Weather } | null = null;

export default defineEventHandler(async (): Promise<Weather> => {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const { latitude, longitude } = useRuntimeConfig().weather;
  if (!latitude || !longitude) {
    throw createError({ statusCode: 503, message: "Wetter ist nicht konfiguriert" });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("current", "temperature_2m,weather_code,is_day");
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
  );
  url.searchParams.set("timezone", "Europe/Berlin");
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));

  const raw = await $fetch<OpenMeteoResponse>(url.href);

  const data: Weather = {
    current: {
      temp: Math.round(raw.current.temperature_2m),
      code: raw.current.weather_code,
      isDay: raw.current.is_day === 1,
    },
    days: raw.daily.time.map((date, i) => ({
      date,
      code: raw.daily.weather_code[i]!,
      max: Math.round(raw.daily.temperature_2m_max[i]!),
      min: Math.round(raw.daily.temperature_2m_min[i]!),
      rain: raw.daily.precipitation_probability_max[i]!,
    })),
  };

  cache = { at: Date.now(), data };
  return data;
});
