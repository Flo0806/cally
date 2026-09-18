export const COLORS = ["blue", "petrol", "plum", "amber", "coral", "moss"] as const;
export type Color = (typeof COLORS)[number];

// Members and categories share one shape: a named, colored, orderable lookup entry
export interface Lookup {
  id: string;
  name: string;
  color: Color;
  position: number;
}

export type Member = Lookup;
export type Category = Lookup;

export interface WeatherDay {
  date: string;
  code: number;
  max: number;
  min: number;
  rain: number;
}

export interface Weather {
  current: { temp: number; code: number; isDay: boolean };
  days: WeatherDay[];
}
