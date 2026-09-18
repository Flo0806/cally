export type WeatherIconName =
  | "sun"
  | "moon"
  | "partly"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

interface WeatherInfo {
  label: string;
  icon: WeatherIconName;
}

// WMO weather interpretation codes as used by Open-Meteo, reduced to what fits on a header.
const CODES: Record<number, WeatherInfo> = {
  0: { label: "Klar", icon: "sun" },
  1: { label: "Überwiegend klar", icon: "sun" },
  2: { label: "Teils bewölkt", icon: "partly" },
  3: { label: "Bedeckt", icon: "cloud" },
  45: { label: "Nebel", icon: "fog" },
  48: { label: "Nebel", icon: "fog" },
  51: { label: "Nieselregen", icon: "drizzle" },
  53: { label: "Nieselregen", icon: "drizzle" },
  55: { label: "Nieselregen", icon: "drizzle" },
  56: { label: "Gefrierender Niesel", icon: "drizzle" },
  57: { label: "Gefrierender Niesel", icon: "drizzle" },
  61: { label: "Leichter Regen", icon: "rain" },
  63: { label: "Regen", icon: "rain" },
  65: { label: "Starker Regen", icon: "rain" },
  66: { label: "Gefrierender Regen", icon: "rain" },
  67: { label: "Gefrierender Regen", icon: "rain" },
  71: { label: "Leichter Schneefall", icon: "snow" },
  73: { label: "Schneefall", icon: "snow" },
  75: { label: "Starker Schneefall", icon: "snow" },
  77: { label: "Schneegriesel", icon: "snow" },
  80: { label: "Regenschauer", icon: "rain" },
  81: { label: "Regenschauer", icon: "rain" },
  82: { label: "Starke Schauer", icon: "rain" },
  85: { label: "Schneeschauer", icon: "snow" },
  86: { label: "Schneeschauer", icon: "snow" },
  95: { label: "Gewitter", icon: "thunder" },
  96: { label: "Gewitter mit Hagel", icon: "thunder" },
  99: { label: "Gewitter mit Hagel", icon: "thunder" },
};

export function weatherInfo(code: number, isDay = true): WeatherInfo {
  const info = CODES[code] ?? { label: "Unbekannt", icon: "cloud" };
  if (!isDay && info.icon === "sun") return { ...info, icon: "moon" };
  return info;
}
