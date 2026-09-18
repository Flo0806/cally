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
