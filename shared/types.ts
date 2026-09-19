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
