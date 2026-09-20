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

export interface CalendarEvent {
  id: string;
  title: string;
  notes: string;
  allDay: boolean;
  start: string;
  end: string;
  rrule: string | null;
  exdates: string[];
  categoryId: string | null;
  memberIds: string[];
  location: string;
  locationLat: number | null;
  locationLon: number | null;
  travelMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

// One resolved instance of an event, what the calendar renders
export interface Occurrence {
  key: string;
  eventId: string;
  title: string;
  allDay: boolean;
  start: string;
  end: string;
  categoryId: string | null;
  memberIds: string[];
  recurring: boolean;
  location: string;
  locationLat: number | null;
  locationLon: number | null;
  travelMinutes: number | null;
}

// Weather at one place and hour
export interface SpotWeather {
  temp: number;
  code: number;
  rain: number;
}

// One of today's events with everything the "Heute" drawer needs decided on the server
export interface TodayEvent extends Occurrence {
  notes: string;
  // When to leave home, only for timed events with a resolved place and a drive time
  departAt: string | null;
  bufferMinutes: number;
  rainWarning: boolean;
  weather: SpotWeather | null;
}

export interface Today {
  date: string;
  events: TodayEvent[];
}

export interface Place {
  label: string;
  lat: number;
  lon: number;
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  position: number;
  memberId: string | null;
  createdAt: string;
  doneAt: string | null;
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  source: string;
  published: string;
  image: string | null;
  // Outlet site, for the favicon
  sourceUrl: string;
}

export interface NewsCategory {
  id: string;
  label: string;
  items: NewsItem[];
}

export interface NewsHeart {
  itemId: string;
  categoryId: string;
  createdAt: string;
}

export interface News {
  fetchedAt: string;
  // Hash over the item ids, changes only when the content changes
  digest: string;
  categories: NewsCategory[];
}

export interface NewsStatus {
  fetchedAt: string;
  digest: string;
}

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
