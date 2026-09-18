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
